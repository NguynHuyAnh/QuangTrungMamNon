namespace QuangTrung.Application.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(string AccessToken, DateTime ExpiresAtUtc, string Email, IReadOnlyList<string> Roles);
