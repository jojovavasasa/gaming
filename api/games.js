export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // optional, increases rate limit
  const REPO_OWNER = "jojovavasasa"; // your GitHub username
  const REPO_NAME = "gaming"; // your repo name

  const headers = {
    "Accept": "application/vnd.github+json",
    ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
  };

  // Fetch .gitmodules from your repo
  const fileRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/.gitmodules`,
    { headers }
  );
  const fileData = await fileRes.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");

  // Parse submodules
  const submodules = [];
  const blocks = content.split("[submodule").slice(1);
  for (const block of blocks) {
    const pathMatch = block.match(/path\s*=\s*(.+)/);
    const urlMatch = block.match(/url\s*=\s*(.+)/);
    if (!pathMatch || !urlMatch) continue;

    const path = pathMatch[1].trim();
    const url = urlMatch[1].trim();
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
    if (!match) continue;

    const [, user, repo] = match;

    // Fetch repo metadata
    const repoRes = await fetch(`https://api.github.com/repos/${user}/${repo}`, { headers });
    const repoData = await repoRes.json();

    submodules.push({
      name: repoData.name ?? repo,
      description: repoData.description ?? "",
      author: user,
      repoUrl: `https://github.com/${user}/${repo}`,
      playPath: `${path}/index.html`,
    });
  }

  res.setHeader("Cache-Control", "s-maxage=0");
  res.status(200).json(submodules);
}