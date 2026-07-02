import inquirer from 'inquirer';

/** Interactive-input port for the CLI controllers (never used off a TTY). */
export interface IPrompt {
  ask(message: string): Promise<string>;
}

export class InquirerPrompt implements IPrompt {
  async ask(message: string): Promise<string> {
    const { answer } = await inquirer.prompt<{ answer: string }>([{ type: 'input', name: 'answer', message }]);
    return answer;
  }
}
