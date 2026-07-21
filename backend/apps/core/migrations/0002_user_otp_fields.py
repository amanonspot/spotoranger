from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="otp",
            field=models.CharField(blank=True, max_length=6, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="otp_expiry",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="max_otp_try",
            field=models.CharField(default="3", max_length=2),
        ),
        migrations.AddField(
            model_name="user",
            name="otp_max_out",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
