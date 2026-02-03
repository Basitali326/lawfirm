from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authx', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='firm',
            name='address',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='firm',
            name='email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='firm',
            name='phone',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='firm',
            name='timezone',
            field=models.CharField(default='Asia/Dubai', max_length=100),
        ),
        migrations.AddField(
            model_name='firm',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
