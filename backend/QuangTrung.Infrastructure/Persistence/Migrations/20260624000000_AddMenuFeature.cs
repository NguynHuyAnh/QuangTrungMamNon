using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuangTrung.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Dishes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Ingredients = table.Column<string>(type: "text", nullable: true),
                    NutritionNote = table.Column<string>(type: "text", nullable: true),
                    CaloriesKcal = table.Column<int>(type: "integer", nullable: true),
                    ContainsAllergen = table.Column<bool>(type: "boolean", nullable: false),
                    AllergenNote = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dishes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DailyMenus",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MenuDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MealType = table.Column<int>(type: "integer", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: true),
                    SchoolYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyMenus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyMenus_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DailyMenus_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DailyMenus_SchoolYears_SchoolYearId",
                        column: x => x.SchoolYearId,
                        principalTable: "SchoolYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DailyMenuItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyMenuId = table.Column<Guid>(type: "uuid", nullable: false),
                    DishId = table.Column<Guid>(type: "uuid", nullable: true),
                    DishName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Ingredients = table.Column<string>(type: "text", nullable: true),
                    NutritionNote = table.Column<string>(type: "text", nullable: true),
                    CaloriesKcal = table.Column<int>(type: "integer", nullable: true),
                    ContainsAllergen = table.Column<bool>(type: "boolean", nullable: false),
                    AllergenNote = table.Column<string>(type: "text", nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyMenuItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyMenuItems_DailyMenus_DailyMenuId",
                        column: x => x.DailyMenuId,
                        principalTable: "DailyMenus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyMenuItems_Dishes_DishId",
                        column: x => x.DishId,
                        principalTable: "Dishes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenuItems_DailyMenuId",
                table: "DailyMenuItems",
                column: "DailyMenuId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenuItems_DishId",
                table: "DailyMenuItems",
                column: "DishId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenus_ClassId",
                table: "DailyMenus",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenus_CreatedByUserId",
                table: "DailyMenus",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenus_MenuDate_MealType_ClassId",
                table: "DailyMenus",
                columns: new[] { "MenuDate", "MealType", "ClassId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenus_SchoolYearId",
                table: "DailyMenus",
                column: "SchoolYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Dishes_Name",
                table: "Dishes",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyMenuItems");

            migrationBuilder.DropTable(
                name: "DailyMenus");

            migrationBuilder.DropTable(
                name: "Dishes");
        }
    }
}
