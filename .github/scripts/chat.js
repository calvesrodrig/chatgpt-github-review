import { ChatGPTAPI } from 'chatgpt'
const temperature = process.env.TEMPERATURE;
const top_p = process.env.TOP_P;

export class Chat {
  constructor(apikey) {
    this.chatAPI = new ChatGPTAPI({
      apiKey: apikey,
      completionParams: {
        model: 'gpt-3.5-turbo',
        temperature: +(temperature || 0) || 1,
        top_p: +(top_p || 0) || 1,
      },
    });
  }

  generatePrompt(patch) {
    return `Me responda em português. Levando em consideração que seguimos os principios de programação: "SOLID" e "Don't Repeat Yourself", e que também prezamos por um código simples, bem enxuto e previsível, preferindo sempre o uso de const ao invés de let, de interfaces com propriedades readonly, de variáveis tipadas ao invés de usar any, de criação de funções e métodos ao invés de código repetido, faça a revisão e aponte melhorias, bugs e o que pode ser feito para aumentar a legibilidade no código. Sempre que puder, escreva um código melhor alternativo para referência e refatoração. Lembre-se que geralmente o que estou passando são só pedaços de códigos de uma feature inteira. Seja breve, o código está a seguir:
    ${patch}
    `;
  };

  async codeReview(patch) {
    if (!patch) {
      return '';
    }

    console.time('code-review cost');
    const prompt = this.generatePrompt(patch);

    const res = await this.chatAPI.sendMessage(prompt);

    console.timeEnd('code-review cost');
    return res.text;
  };
}
