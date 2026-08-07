# create-yourtomo

Setup wizard for [YourTomo](https://github.com/prsdx/github-pet) — the pixel
cat that lives on your GitHub profile. It removes the YAML-editing step of
installing the Action.

## Usage

Run it at the root of your profile repo (`<your-username>/<your-username>`):

```bash
npx create-yourtomo
```

It will:

1. Ask for your **GitHub username** (default: your `gh` CLI login, else
   `git config user.name`).
2. Ask for your **timezone** as an IANA name (e.g. `Asia/Kolkata`, default:
   your system timezone) and compute `timezone-offset-minutes` for you — no
   UTC-offset math.
3. Optionally ask for a **cat name**, **accent color** and **hibernate-until**
   date — all skippable, empty means default behavior.
4. Write `.github/workflows/pet.yml`, filled in and ready.
5. Print the `<picture>` embed snippet for your `README.md` with your
   username already substituted.

It **never commits or pushes** — review the files, then:

```bash
git add .github/workflows/pet.yml && git commit -m "Add my YourTomo cat" && git push
```

Zero dependencies (Node 18+ stdlib only), in the spirit of the main project.

## Publishing (maintainer)

```bash
cd packages/create-yourtomo
npm publish --access public
