using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Application.Constants;
using QuangTrung.Infrastructure.Identity;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersDirectoryController(
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    public sealed record UserOptionRow(Guid Id, string Email);

    public sealed record UserDirectoryRow(Guid Id, string Email, string FullName, IReadOnlyList<string> Roles, bool IsLocked);

    public sealed record UserDetailDto(
        Guid Id,
        string Email,
        string FullName,
        IReadOnlyList<string> Roles,
        bool IsLocked);

    public sealed record UpdateUserRequest(
        string FullName,
        string Email,
        IReadOnlyList<string> Roles,
        bool LockoutEnabled,
        string? NewPassword);

    /// <summary>Danh sách tài khoản (BGH / SuperAdmin): email, tên, vai trò; tìm theo email hoặc họ tên.</summary>
    [HttpGet]
    [Authorize(Policy = AppPolicies.UsersReadDirectory)]
    public async Task<ActionResult<PagedResult<UserDirectoryRow>>> GetDirectory(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userQuery = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var t = q.Trim();
            userQuery = userQuery.Where(u =>
                (u.Email != null && u.Email.Contains(t)) || u.FullName.Contains(t));
        }

        var total = await userQuery.CountAsync(ct);
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var slice = await userQuery
            .OrderBy(u => u.Email)
            .Skip(skip)
            .Take(ps)
            .Select(u => new { u.Id, Email = u.Email ?? u.Id.ToString(), u.FullName, u.LockoutEnd })
            .ToListAsync(ct);

        if (slice.Count == 0)
        {
            return Ok(new PagedResult<UserDirectoryRow>
            {
                Items = [],
                TotalCount = total,
                Page = p,
                PageSize = ps,
            });
        }

        var ids = slice.Select(x => x.Id).ToList();
        var roleLinks = await (
            from link in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on link.RoleId equals role.Id
            where ids.Contains(link.UserId)
            select new { link.UserId, RoleName = role.Name ?? "" }
        ).ToListAsync(ct);

        var roleMap = roleLinks
            .GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(x => x.RoleName).Where(n => n.Length > 0).OrderBy(n => n).ToList());

        var now = DateTimeOffset.UtcNow;
        var items = slice
            .Select(u => new UserDirectoryRow(
                u.Id,
                u.Email,
                u.FullName,
                roleMap.GetValueOrDefault(u.Id) ?? [],
                u.LockoutEnd.HasValue && u.LockoutEnd > now))
            .ToList();

        return Ok(new PagedResult<UserDirectoryRow>
        {
            Items = items,
            TotalCount = total,
            Page = p,
            PageSize = ps,
        });
    }

    /// <summary>Đặt literal route trước `{id}` để không bị nhầm (và để IntelliSense/route table rõ).</summary>
    [HttpGet("homeroom-options")]
    [Authorize(Policy = AppPolicies.ClassesRead)]
    public async Task<ActionResult<IReadOnlyList<UserOptionRow>>> GetHomeroomOptions(CancellationToken ct)
    {
        var roleIds = await db.Roles.AsNoTracking()
            .Where(r => r.Name == AppRoles.GiaoVien || r.Name == AppRoles.BanGiamHieu)
            .Select(r => r.Id)
            .ToListAsync(ct);
        if (roleIds.Count == 0)
            return Ok(Array.Empty<UserOptionRow>());

        var userIds = await db.UserRoles.AsNoTracking()
            .Where(ur => roleIds.Contains(ur.RoleId))
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync(ct);

        var rows = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .OrderBy(u => u.Email)
            .Select(u => new UserOptionRow(u.Id, u.Email ?? u.Id.ToString()))
            .ToListAsync(ct);
        return Ok(rows);
    }

    /// <remarks>
    /// Dùng cùng nguồn truy vấn EF như GET danh sách (<c>Users</c> / <c>u.Id == id</c>).
    /// Một số môi trường <c>FindByIdAsync(string)</c> không khớp GUID → 404 dù user vẫn có trong DB.
    /// </remarks>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.UsersManage)]
    public async Task<ActionResult<UserDetailDto>> GetById(Guid id, CancellationToken ct)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            return NotFound();

        var roles = await userManager.GetRolesAsync(user);
        var locked = await userManager.IsLockedOutAsync(user);
        return Ok(new UserDetailDto(user.Id, user.Email ?? user.Id.ToString(), user.FullName, roles.OrderBy(r => r).ToList(), locked));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.UsersManage)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest? request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Họ tên và email là bắt buộc.");

        var actorId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == actorId && request.LockoutEnabled)
            return BadRequest("Không thể tự khóa tài khoản của chính mình.");

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            return NotFound();

        var email = request.Email.Trim();
        var other = await userManager.FindByEmailAsync(email);
        if (other is not null && other.Id != user.Id)
            return Conflict("Email đã được sử dụng.");

        if (request.Roles is null || request.Roles.Count == 0)
            return BadRequest("Cần ít nhất một vai trò.");

        foreach (var r in request.Roles)
        {
            if (!AppRoles.All.Contains(r))
                return BadRequest($"Vai trò không hợp lệ: {r}");
        }

        var distinctRoles = request.Roles.Distinct(StringComparer.Ordinal).ToList();
        if (distinctRoles.Count != request.Roles.Count)
            return BadRequest("Không được trùng vai trò trong danh sách.");
        if (distinctRoles.Count != 1)
            return BadRequest("Mỗi tài khoản chỉ được gán đúng một vai trò.");

        var newRole = distinctRoles[0]!;
        var hadSuper = await userManager.IsInRoleAsync(user, AppRoles.SuperAdmin);
        var hasSuper = newRole == AppRoles.SuperAdmin;
        if (hadSuper && !hasSuper)
        {
            var superCount = await CountUsersInRoleAsync(AppRoles.SuperAdmin, ct);
            if (superCount <= 1)
                return BadRequest("Không thể gỡ SuperAdmin khỏi tài khoản SuperAdmin duy nhất.");
        }

        user.FullName = request.FullName.Trim();
        var setEmail = await userManager.SetEmailAsync(user, email);
        if (!setEmail.Succeeded)
            return BadRequest(setEmail.Errors.Select(e => e.Description).ToList());
        var setUserName = await userManager.SetUserNameAsync(user, email);
        if (!setUserName.Succeeded)
            return BadRequest(setUserName.Errors.Select(e => e.Description).ToList());

        var currentRoles = await userManager.GetRolesAsync(user);
        var rolesMatch =
            currentRoles.Count == 1 && string.Equals(currentRoles[0], newRole, StringComparison.Ordinal);
        if (!rolesMatch)
        {
            if (currentRoles.Count > 0)
            {
                var rem = await userManager.RemoveFromRolesAsync(user, currentRoles);
                if (!rem.Succeeded)
                    return BadRequest(rem.Errors.Select(e => e.Description).ToList());
            }

            var addOne = await userManager.AddToRoleAsync(user, newRole);
            if (!addOne.Succeeded)
                return BadRequest(addOne.Errors.Select(e => e.Description).ToList());
        }

        if (request.LockoutEnabled)
        {
            await userManager.SetLockoutEnabledAsync(user, true);
            await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
        }
        else
        {
            await userManager.SetLockoutEndDateAsync(user, null);
            await userManager.SetLockoutEnabledAsync(user, false);
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var pwd = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!pwd.Succeeded)
                return BadRequest(pwd.Errors.Select(e => e.Description).ToList());
        }

        var updateStamp = await userManager.UpdateAsync(user);
        if (!updateStamp.Succeeded)
            return BadRequest(updateStamp.Errors.Select(e => e.Description).ToList());

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.UsersManage)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var actorId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == actorId)
            return BadRequest("Không thể xóa chính tài khoản đang đăng nhập.");

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            return NotFound();

        if (await userManager.IsInRoleAsync(user, AppRoles.SuperAdmin))
        {
            var superCount = await CountUsersInRoleAsync(AppRoles.SuperAdmin, ct);
            if (superCount <= 1)
                return BadRequest("Không thể xóa SuperAdmin cuối cùng.");
        }

        try
        {
            var del = await userManager.DeleteAsync(user);
            if (!del.Succeeded)
                return BadRequest(del.Errors.Select(e => e.Description).ToList());
            return NoContent();
        }
        catch (DbUpdateException)
        {
            return Conflict("Không xóa được: tài khoản còn dữ liệu liên quan (điểm danh, thanh toán, …). Hãy khóa tài khoản thay vì xóa.");
        }
    }

    private async Task<int> CountUsersInRoleAsync(string roleName, CancellationToken ct)
    {
        var rid = await db.Roles.AsNoTracking()
            .Where(r => r.Name == roleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(ct);
        if (rid == Guid.Empty)
            return 0;
        return await db.UserRoles.AsNoTracking().CountAsync(ur => ur.RoleId == rid, ct);
    }
}
