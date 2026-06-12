namespace QuangTrung.Application.Abstractions;

public interface IJwtTokenService
{
    string CreateAccessToken(Guid userId, string userName, string? email, IEnumerable<string> roles, TimeSpan lifetime);
}
