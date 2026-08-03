using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuangTrung.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FeeCategoryId",
                table: "FeeStructures",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FeeCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeCategories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_FeeCategoryId",
                table: "FeeStructures",
                column: "FeeCategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructures_FeeCategories_FeeCategoryId",
                table: "FeeStructures",
                column: "FeeCategoryId",
                principalTable: "FeeCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructures_FeeCategories_FeeCategoryId",
                table: "FeeStructures");

            migrationBuilder.DropTable(
                name: "FeeCategories");

            migrationBuilder.DropIndex(
                name: "IX_FeeStructures_FeeCategoryId",
                table: "FeeStructures");

            migrationBuilder.DropColumn(
                name: "FeeCategoryId",
                table: "FeeStructures");
        }
    }
}
