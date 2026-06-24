#!/usr/bin/env node
/**
 * Bootstrap Linear project "Olise" + backlog issues.
 *
 * Usage:
 *   LINEAR_API_KEY=lin_api_xxx node scripts/linear-bootstrap.mjs
 *   LINEAR_API_KEY=lin_api_xxx LINEAR_TEAM_ID=uuid node scripts/linear-bootstrap.mjs
 *
 * Get API key: Linear → Settings → API → Personal API keys
 * Get team ID: script prints teams if LINEAR_TEAM_ID is unset
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_URL = 'https://api.linear.app/graphql'
const API_KEY = process.env.LINEAR_API_KEY

if (!API_KEY) {
  console.error('Missing LINEAR_API_KEY. Get one at https://linear.app/settings/api')
  process.exit(1)
}

async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  return json.data
}

async function listTeams() {
  const data = await gql(`{ teams { nodes { id name key } } }`)
  return data.teams.nodes
}

async function createProject({ name, description, content, teamId }) {
  const data = await gql(
    `mutation($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project { id name url }
      }
    }`,
    {
      input: {
        name,
        description,
        content,
        teamIds: [teamId],
      },
    },
  )
  if (!data.projectCreate.success) throw new Error('projectCreate failed')
  return data.projectCreate.project
}

async function createIssue({ title, description, teamId, projectId, priority }) {
  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }`,
    {
      input: {
        title,
        description,
        teamId,
        projectId,
        priority: priority ?? 3,
      },
    },
  )
  if (!data.issueCreate.success) throw new Error(`issueCreate failed: ${title}`)
  return data.issueCreate.issue
}

async function main() {
  const backlog = JSON.parse(readFileSync(join(__dirname, 'linear-backlog.json'), 'utf8'))

  let teamId = process.env.LINEAR_TEAM_ID
  const teams = await listTeams()

  if (!teams.length) {
    console.error('No teams found in your Linear workspace.')
    process.exit(1)
  }

  if (!teamId) {
    teamId = teams[0].id
    console.log('Teams:')
    for (const t of teams) console.log(`  ${t.key} — ${t.name} (${t.id})`)
    console.log(`\nUsing first team: ${teams[0].key} — ${teams[0].name}`)
    console.log('Set LINEAR_TEAM_ID to override.\n')
  }

  console.log(`Creating project "${backlog.project.name}"…`)
  const project = await createProject({
    name: backlog.project.name,
    description: backlog.project.description,
    content: backlog.project.content,
    teamId,
  })
  console.log(`  → ${project.url}\n`)

  console.log(`Creating ${backlog.issues.length} issues…`)
  for (const issue of backlog.issues) {
    const created = await createIssue({
      title: issue.title,
      description: issue.description,
      teamId,
      projectId: project.id,
      priority: issue.priority,
    })
    console.log(`  ${created.identifier}  ${created.title}`)
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`\nDone. Project: ${project.url}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
