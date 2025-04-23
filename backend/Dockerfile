FROM python:3.12

WORKDIR /app

RUN pip install pdm

# ✅ 여기에 명시적으로 인터프리터 설정
ENV PDM_IGNORE_SAVED_PYTHON=1
RUN pdm config python.use_venv true

COPY pyproject.toml pdm.lock ./
RUN rm -rf .venv
RUN pdm install

COPY . .

CMD ["sh", "-c", "pdm run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]


