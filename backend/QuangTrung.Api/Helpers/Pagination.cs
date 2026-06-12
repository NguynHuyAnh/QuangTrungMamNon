namespace QuangTrung.Api.Helpers;

public static class Pagination
{
    public static (int Page, int PageSize, int Skip) Normalize(int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;
        var skip = (page - 1) * pageSize;
        return (page, pageSize, skip);
    }
}
