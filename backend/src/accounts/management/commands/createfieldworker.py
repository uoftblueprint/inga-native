import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = "Create a field worker account"

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]

        if User.objects.filter(username=username).exists():
            raise CommandError(f"User '{username}' already exists")

        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Password (again): ")
        if password != confirm:
            raise CommandError("Passwords do not match")

        User.objects.create_user(
            username=username,
            password=password,
            first_name=options["first_name"],
            last_name=options["last_name"],
        )
        self.stdout.write(self.style.SUCCESS(f"Created field worker '{username}'"))