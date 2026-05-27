# Generated manually for product image_url support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0013_alter_userprofile_role_customer'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='image_url',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
    ]
