from django.db import migrations


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="""
                DROP TABLE IF EXISTS chatx_messagereceipt CASCADE;
                DROP TABLE IF EXISTS chatx_chatattachment CASCADE;
                DROP TABLE IF EXISTS chatx_chatmessage CASCADE;
                DROP TABLE IF EXISTS chatx_chatroommember CASCADE;
                DROP TABLE IF EXISTS chatx_chatroom CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
