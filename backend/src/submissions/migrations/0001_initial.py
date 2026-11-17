from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Submission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("uuid", models.UUIDField(unique=True)),
                ("recorded_at", models.DateTimeField(blank=True, null=True)),
                ("metadata", models.JSONField(default=dict)),
                ("expected_photo_ids", models.JSONField(default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="projects.site")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="SubmissionDelivery",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=6, max_digits=20)),
                ("item", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="projects.supplyitem")),
                ("submission", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="deliveries", to="submissions.submission")),
            ],
        ),
        migrations.AddConstraint(
            model_name="submissiondelivery",
            constraint=models.UniqueConstraint(fields=("submission", "item"), name="unique_delivery_item_per_submission"),
        ),
    ]
