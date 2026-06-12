using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QuangTrung.Application.Abstractions;

namespace QuangTrung.Infrastructure.Identity;

public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _opt = options.Value;

    public string CreateAccessToken(Guid userId, string userName, string? email, IEnumerable<string> roles, TimeSpan lifetime)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, userName)
        };
        if (!string.IsNullOrEmpty(email))
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, email));
        foreach (var r in roles.Distinct())
            claims.Add(new Claim(ClaimTypes.Role, r));

        var token = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: _opt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(lifetime),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
