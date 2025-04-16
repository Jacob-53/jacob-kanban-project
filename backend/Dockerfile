FROM python:3.12

WORKDIR /app

RUN pip install pdm

COPY pyproject.toml pdm.lock ./
RUN pdm install

COPY . .

CMD ["sh", "-c", "pdm run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]


