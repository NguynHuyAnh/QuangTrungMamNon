using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Abstractions;
using QuangTrung.Application.Auth;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Identity;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions,
    ApplicationDbContext db,
    ILookupNormalizer keyNormalizer,
    IWebHostEnvironment hostEnvironment) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest? request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Email) || request.Password is null)
            return BadRequest("Email và mật khẩu là bắt buộc.");

        var email = request.Email.Trim();
        var normalizedEmail = keyNormalizer.NormalizeEmail(email);
        if (string.IsNullOrEmpty(normalizedEmail))
            return Unauthorized();

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, ct);
        if (user is null)
            return Unauthorized();

        if (!await userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized();

        if (await userManager.IsLockedOutAsync(user))
            return StatusCode(StatusCodes.Status403Forbidden, "Tài khoản đang bị khóa.");

        var roles = await userManager.GetRolesAsync(user);
        var jwt = jwtOptions.Value;
        var lifetime = TimeSpan.FromMinutes(jwt.AccessTokenMinutes);
        var accessToken = jwtTokenService.CreateAccessToken(
            user.Id,
            user.UserName ?? user.Email ?? user.Id.ToString(),
            user.Email,
            roles,
            lifetime);

        return Ok(new LoginResponse(accessToken, DateTime.UtcNow.Add(lifetime), user.Email ?? request.Email, roles.ToList()));
    }

    [HttpPost("register-parent")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> RegisterParent([FromBody] RegisterParentRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email và mật khẩu là bắt buộc.");

        if (await userManager.FindByEmailAsync(request.Email) is not null)
            return Conflict("Email đã được sử dụng.");

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim(),
            UserName = request.Email.Trim(),
            NormalizedEmail = request.Email.Trim().ToUpperInvariant(),
            NormalizedUserName = request.Email.Trim().ToUpperInvariant(),
            EmailConfirmed = true,
            FullName = request.FullName.Trim(),
            SecurityStamp = Guid.NewGuid().ToString("D")
        };

        var create = await userManager.CreateAsync(user, request.Password);
        if (!create.Succeeded)
            return BadRequest(create.Errors.Select(e => e.Description).ToList());

        await userManager.AddToRoleAsync(user, AppRoles.PhuHuynh);

        Guid? linkStudentId = null;
        if (request.StudentIdToLink is { } explicitId
            && await db.Students.AsNoTracking().AnyAsync(s => s.Id == explicitId && !s.IsDeleted, ct))
            linkStudentId = explicitId;
        if (linkStudentId is null && !string.IsNullOrWhiteSpace(request.StudentRegistrationCodeToLink))
            linkStudentId = await StudentLinkCodeResolution.ResolveAsync(db, request.StudentRegistrationCodeToLink.Trim(), ct);

        if (linkStudentId is { } sid)
        {
            db.UserStudentLinks.Add(new UserStudentLink
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                StudentId = sid,
                Relationship = "Phụ huynh",
                IsPrimary = true,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }

        var roles = await userManager.GetRolesAsync(user);
        var jwt = jwtOptions.Value;
        var lifetime = TimeSpan.FromMinutes(jwt.AccessTokenMinutes);
        var token = jwtTokenService.CreateAccessToken(
            user.Id,
            user.UserName ?? user.Email!,
            user.Email,
            roles,
            lifetime);

        return Ok(new LoginResponse(token, DateTime.UtcNow.Add(lifetime), user.Email!, roles.ToList()));
    }

    [HttpPost("register-staff")]
    [Authorize(Policy = AppPolicies.UsersCreateStaff)]
    public async Task<IActionResult> RegisterStaff([FromBody] RegisterStaffRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email và mật khẩu là bắt buộc.");

        var role = request.Role.Trim();

        var callerIsSuperAdmin = User.IsInRole(AppRoles.SuperAdmin);
        if (callerIsSuperAdmin)
        {
            if (role is not (AppRoles.BanGiamHieu or AppRoles.GiaoVien or AppRoles.KeToan or AppRoles.PhuHuynh))
                return BadRequest(
                    "Super admin chỉ được tạo tài khoản Ban giám hiệu, Giáo viên, Kế toán hoặc Phụ huynh (không tạo Super admin qua form này).");
        }
        else if (User.IsInRole(AppRoles.BanGiamHieu))
        {
            if (role is not (AppRoles.GiaoVien or AppRoles.KeToan))
                return BadRequest("Ban giám hiệu chỉ được tạo tài khoản Giáo viên hoặc Kế toán.");
        }
        else
            return Forbid();

        if (await userManager.FindByEmailAsync(request.Email) is not null)
            return Conflict("Email đã được sử dụng.");

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim(),
            UserName = request.Email.Trim(),
            NormalizedEmail = request.Email.Trim().ToUpperInvariant(),
            NormalizedUserName = request.Email.Trim().ToUpperInvariant(),
            EmailConfirmed = true,
            FullName = request.FullName.Trim(),
            SecurityStamp = Guid.NewGuid().ToString("D")
        };

        var create = await userManager.CreateAsync(user, request.Password);
        if (!create.Succeeded)
            return BadRequest(create.Errors.Select(e => e.Description).ToList());

        await userManager.AddToRoleAsync(user, role);
        return Ok(new { user.Id, user.Email, role });
    }

    /// <summary>Gửi yêu cầu đặt lại mật khẩu. Trả cùng một dạng message để không lộ email có tồn tại hay không.</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword([FromBody] ForgotPasswordRequest? request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email là bắt buộc.");

        const string publicMessage =
            "Nếu địa chỉ email đã được đăng ký, bạn sẽ nhận hướng dẫn đặt lại mật khẩu (kiểm tra cả thư mục spam). "
            + "Nếu không thấy email, vui lòng liên hệ ban giám hiệu hoặc quản trị viên.";

        var normalizedEmail = keyNormalizer.NormalizeEmail(request.Email.Trim());
        if (string.IsNullOrEmpty(normalizedEmail))
            return Ok(new ForgotPasswordResponse(publicMessage, null));

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, ct);
        string? tokenForDev = null;
        if (user is not null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            if (hostEnvironment.IsDevelopment())
                tokenForDev = token;
            // Production: gửi email chứa link + token (cần cấu hình SMTP / IEmailSender).
        }

        var message = publicMessage;
        if (hostEnvironment.IsDevelopment() && tokenForDev is not null)
            message += " [Development] Có thể dùng token trả về để đặt lại mật khẩu ngay trên trang web.";

        return Ok(new ForgotPasswordResponse(message, tokenForDev));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest? request, CancellationToken ct)
    {
        if (request is null
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Token)
            || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest("Email, mã xác nhận và mật khẩu mới là bắt buộc.");

        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
            return BadRequest("Không đặt lại được mật khẩu. Kiểm tra email hoặc mã xác nhận.");

        IdentityResult result;
        try
        {
            result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        }
        catch
        {
            return BadRequest("Mã xác nhận không hợp lệ hoặc đã hết hạn.");
        }

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description).ToList());

        return NoContent();
    }
}
