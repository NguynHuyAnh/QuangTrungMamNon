using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuangTrung.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentRegistrationCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RegistrationCode",
                table: "Students",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Students_RegistrationCode",
                table: "Students",
                column: "RegistrationCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Students_RegistrationCode",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "RegistrationCode",
                table: "Students");
        }
    }
}
