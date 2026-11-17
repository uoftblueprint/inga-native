from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Project",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("log_schema", models.JSONField(blank=True, default=dict)),
            ],
        ),
        migrations.CreateModel(
            name="Region",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
            ],
        ),
        migrations.CreateModel(
            name="SupplyItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("category", models.CharField(choices=[("seed", "Seeds"), ("seedling", "Seedlings"), ("sapling", "Saplings"), ("other", "Other")], max_length=20)),
                ("unit", models.CharField(choices=[("seeds", "Seeds"), ("seedlings", "Seedlings"), ("saplings", "Saplings"), ("kg", "Kilograms"), ("g", "Grams"), ("lb", "Pounds")], max_length=20)),
                ("active", models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name="Site",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="projects.project")),
                ("region", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="projects.region")),
            ],
        ),
    ]
