from django.db import migrations


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("cases", "0010_case_tasks_generated_by"),
        ("tasks", "0002_tasknote"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_cases_case_firm_status "
                "ON cases_case (firm_id, status);"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_cases_case_firm_status;",
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_cases_case_firm_created_at "
                "ON cases_case (firm_id, created_at);"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_cases_case_firm_created_at;",
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_tasks_casetask_firm_created_at "
                "ON tasks_casetask (firm_id, created_at);"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_tasks_casetask_firm_created_at;",
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS idx_cases_clientprofile_firm_created_at "
                "ON cases_clientprofile (firm_id, created_at);"
            ),
            reverse_sql="DROP INDEX IF EXISTS idx_cases_clientprofile_firm_created_at;",
        ),
    ]

