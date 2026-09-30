# Haya's section: how to run

The scrolling story (the home page) is a static site: there is nothing to install.

## Option 1: open the file

```bash
open index.html
```

## Option 2: serve it locally (recommended)

```bash
python3 -m http.server 8741
```

Open [http://localhost:8741](http://localhost:8741)

The page loads its fonts, icons and scrollama from the internet, so it needs a network connection.
