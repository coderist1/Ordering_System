from django.db import migrations, models


def forwards_user_to_customer(apps, schema_editor):
    UserProfile = apps.get_model('orders', 'UserProfile')
    UserProfile.objects.filter(role='user').update(role='customer')


def backwards_customer_to_user(apps, schema_editor):
    UserProfile = apps.get_model('orders', 'UserProfile')
    UserProfile.objects.filter(role='customer').update(role='user')


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0012_chatmessage_knowledgebase'),
    ]

    operations = [
        migrations.RunPython(forwards_user_to_customer, backwards_customer_to_user),
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[('customer', 'Customer'), ('owner', 'Owner'), ('admin', 'Admin')],
                default='customer',
                max_length=20,
            ),
        ),
    ]
