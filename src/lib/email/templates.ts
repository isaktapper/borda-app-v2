// Base email layout
function baseLayout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      padding: 30px;
      text-align: center;
      color: #999;
      font-size: 14px;
      border-top: 1px solid #eee;
    }
    .task-item {
      background: #f9f9f9;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 4px solid #14b8a6;
    }
    .task-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    .task-description {
      color: #666;
      font-size: 14px;
    }
    .task-due {
      color: #f59e0b;
      font-size: 13px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>Skickat från Impel</p>
    </div>
  </div>
</body>
</html>
  `
}

interface CustomerInviteParams {
  projectName: string
  clientName: string
  accessLink: string
}

export function customerInviteTemplate({
  projectName,
  clientName,
  accessLink
}: CustomerInviteParams) {
  const content = `
    <div class="header">
      <h1>Välkommen till ${projectName}!</h1>
    </div>
    <div class="content">
      <p>Hej ${clientName},</p>
      <p>Du har fått tillgång till ditt projekt på Impel. Här kan du följa framstegen, ladda upp filer och svara på frågor.</p>
      <p style="text-align: center;">
        <a href="${accessLink}" class="button">Öppna portalen</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Länken är personlig och kräver inget lösenord. Spara den säkert för framtida åtkomst.
      </p>
    </div>
  `
  return baseLayout(content)
}

interface OrgInviteParams {
  organizationName: string
  invitedByName: string
  inviteLink: string
}

export function orgInviteTemplate({
  organizationName,
  invitedByName,
  inviteLink
}: OrgInviteParams) {
  const content = `
    <div class="header">
      <h1>Inbjudan till ${organizationName}</h1>
    </div>
    <div class="content">
      <p>Hej!</p>
      <p>${invitedByName} har bjudit in dig till att bli medlem i <strong>${organizationName}</strong> på Impel.</p>
      <p>Som medlem kan du samarbeta med teamet, hantera projekt och kommunicera med kunder.</p>
      <p style="text-align: center;">
        <a href="${inviteLink}" class="button">Acceptera inbjudan</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Om du inte känner igen den här inbjudan kan du ignorera detta mejl.
      </p>
    </div>
  `
  return baseLayout(content)
}

interface Task {
  title: string
  description?: string
  due_date?: string
}

interface TaskReminderParams {
  tasks: Task[]
  projectName: string
  portalLink: string
}

export function taskReminderTemplate({
  tasks,
  projectName,
  portalLink
}: TaskReminderParams) {
  const tasksList = tasks.map(task => `
    <div class="task-item">
      <div class="task-title">${task.title}</div>
      ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
      ${task.due_date ? `<div class="task-due">Förfaller: ${new Date(task.due_date).toLocaleDateString('sv-SE')}</div>` : ''}
    </div>
  `).join('')

  const content = `
    <div class="header">
      <h1>Påminnelse: Uppgifter att slutföra</h1>
    </div>
    <div class="content">
      <p>Hej!</p>
      <p>Du har ${tasks.length} uppgift${tasks.length > 1 ? 'er' : ''} som förfaller inom kort i projektet <strong>${projectName}</strong>:</p>
      ${tasksList}
      <p style="text-align: center;">
        <a href="${portalLink}" class="button">Gå till portalen</a>
      </p>
    </div>
  `
  return baseLayout(content)
}
