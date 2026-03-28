from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ecommerce", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="category",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.PROTECT, related_name="products", to="ecommerce.category"),
        ),
        migrations.AlterField(
            model_name="product",
            name="collection",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.PROTECT, related_name="products", to="ecommerce.collection"),
        ),
    ]
