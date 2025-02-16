# treehacks2025

react + tailwind + flask + postgres

First, create a postgres database,

```bash
createdb rebasedb
```

```bash
cd client
yarn install
yarn run build
```

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 wsgi.py
```

navigate to `http://127.0.0.1:2000`
