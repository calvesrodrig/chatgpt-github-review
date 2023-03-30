import { Chat } from "./chat.js"
import { Octokit } from "@octokit/rest"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const [owner, repo] = process.env.REPOSITORY.split("/");
const pull_number = process.env.PULL_NUMBER;
const MAX_PATCH_COUNT = 4000;

export const run = async () => {
  if (!OPENAI_API_KEY) {
    console.error('Você não passou a chave da API do chatgpt')
    process.exit(1)
  }
  if (!GITHUB_TOKEN) {
    console.error('Você não passou o token do github')
    process.exit(1)
  }
  try {
    await robot()
  } catch (error) { 
    console.error(error)
    process.exit(1)
  }
  
};

const robot = async () => {
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const chat = await loadChat();

  if (!chat) {
    return "no chat";
  }

  const pull_request = (
    await octokit.rest.pulls.get({ repo, owner, pull_number })
  ).data;

  console.log(pull_request.head.sha)

  const data = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base: pull_request.base.sha,
    head: pull_request.head.sha,
  });

  let { files: changedFiles, commits } = data.data;

  if (commits.length >= 2) {
    const {
      data: { files },
    } = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: commits[commits.length - 2].sha,
      head: commits[commits.length - 1].sha,
    });

    const filesNames = files?.map((file) => file.filename) || [];
    changedFiles = changedFiles?.filter((file) =>
      filesNames.includes(file.filename)
    );
  }

  if (!changedFiles?.length) {
    return "no change";
  }

  console.time("gpt cost");

  for (let i = 0; i < changedFiles.length; i++) {
    const file = changedFiles[i];
    const patch = file.patch || "";

    if (file.status !== "modified" && file.status !== "added") {
      continue;
    }

    if (!patch || patch.length > MAX_PATCH_COUNT) {
      continue;
    }
    const res = await chat?.codeReview(patch);

    if (!!res) {
      await octokit.pulls.createReviewComment({
        repo,
        owner,
        pull_number,
        commit_id: commits[commits.length - 1].sha,
        path: file.filename,
        body: res,
        line: patch.split("\n").length - 1,
      });
    }
  }

  console.timeEnd("gpt cost");
  console.info("suceess reviewed", pull_request.html_url);

  return "success";
}

const loadChat = async () => {
  if (OPENAI_API_KEY) {
    return new Chat(OPENAI_API_KEY);
  }
  console.error("You did not provided the OPENAI_API_KEY");
  return;
};
