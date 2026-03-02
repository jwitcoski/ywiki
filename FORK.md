# Forking ywiki (taking over the project)

**Fork** is the right term: you create your own copy of the repo under your GitHub account or org and maintain it from there.

## Your fork

**https://github.com/jwitcoski/ywiki** — fork of [philion/ywiki](https://github.com/philion/ywiki).

## Point your local repo at your fork and push

From your existing clone (the one with your changes):

```powershell
cd c:\Users\jwitc\Documents\GitHub\testwiki\ywiki

# Point origin at your fork
git remote set-url origin https://github.com/jwitcoski/ywiki.git

# Push your branch (use 'main' if that's your default branch)
git push -u origin master
```

Optional: if origin is still philion/ywiki and you want to keep it as upstream:

```powershell
git remote rename origin upstream
git remote add origin https://github.com/jwitcoski/ywiki.git
git push -u origin master
```

## Project URLs

- **pom.xml**: `<scm><url>` is set to `https://github.com/jwitcoski/ywiki.git`.
- **README.md**: Fork note at the top credits [philion/ywiki](https://github.com/philion/ywiki).

After this, **origin** is your fork; push and pull there. You can keep **upstream** as `philion/ywiki` to pull occasional updates with `git pull upstream master` if needed.
