from pathlib import Path
import sys

from dotenv import load_dotenv
from openai import OpenAI
import os


def extract_project_description(readme_path: Path) -> str:
    if not readme_path.exists():
        return "Проект для редактора: веб-приложение для проверки полноты клиентских брифов."

    lines = readme_path.read_text(encoding="utf-8").splitlines()

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            continue
        if stripped.startswith("##"):
            continue
        return stripped

    return "Проект для редактора: веб-приложение для проверки полноты клиентских брифов."


def main() -> int:
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if not api_key or api_key == "sk-...":
        print("Ошибка: укажите реальный OPENAI_API_KEY в файле .env")
        return 1

    readme_path = Path(__file__).with_name("README.md")
    project_description = extract_project_description(readme_path)

    prompt = (
        "Придумай 3 креативных названия для моего проекта: "
        f"{project_description}"
    )

    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )
        print("Ответ AI:\n")
        print(response.output_text)
        return 0
    except Exception as exc:
        print(f"Ошибка при обращении к OpenAI API: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
