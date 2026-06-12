namespace QuangTrung.Application.Auth;

public sealed record ForgotPasswordRequest(string Email);

public sealed record ForgotPasswordResponse(string Message, string? ResetToken);

public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);
