import  { Octokit } from '@octokit/rest'
import process from 'node:process'

const TOKEN = process.env.TOKEN
const numberOfWorkflows = process.env.NUMBER_OF_WORKFLOWS
const [owner, repo] = process.env.REPOSITORY.split('/')
const issue_number = process.env.PR_NUMBER

const check = async () => {
    const octokit = new Octokit({ auth: TOKEN })
    const { data: comments } = await octokit.issues.listComments({owner, repo, issue_number})
    const botComments = comments.filter(({ user, body }) => user.login === 'github-actions[bot]' && (body[0] === '❌' || body[0] === '✅'))
    if (botComments.length < numberOfWorkflows) {
        console.error(`Ainda não foram executados todos os workflows desta PR`)
        process.exit(1)
    }
    const failedSteps = botComments.filter(({body}) => body.includes('❌'))
    if (failedSteps.length) {
        failedSteps.forEach(step => console.error(`Erro: Impossível fazer merge - ${step.body}`))
        process.exit(1)
    }
    console.log('Todos os workflows foram concluidos com sucesso')
    process.exit(0)
}

check()