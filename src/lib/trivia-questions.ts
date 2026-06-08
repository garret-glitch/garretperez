export interface TriviaQuestion {
  id: number
  question: string
  options: string[]
  correct: number
}

export const WINE_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    question: 'Which grape variety is primarily used in red Bordeaux wines?',
    options: ['Pinot Noir', 'Cabernet Sauvignon', 'Syrah', 'Malbec'],
    correct: 1,
  },
  {
    id: 2,
    question: 'Which country produces Rioja wine?',
    options: ['Italy', 'France', 'Spain', 'Argentina'],
    correct: 2,
  },
  {
    id: 3,
    question: 'What does "Blanc de Blancs" Champagne mean?',
    options: ['White wine from red grapes', 'White wine from white grapes', 'Sparkling wine from Burgundy', 'Sweet white wine'],
    correct: 1,
  },
  {
    id: 4,
    question: 'Which French region is most famous for Pinot Noir?',
    options: ['Bordeaux', 'Alsace', 'Burgundy', 'Rhône'],
    correct: 2,
  },
  {
    id: 5,
    question: 'What grape variety is used to make Barolo wine?',
    options: ['Sangiovese', 'Barbera', 'Dolcetto', 'Nebbiolo'],
    correct: 3,
  },
  {
    id: 6,
    question: 'What type of wine is Prosecco?',
    options: ['Italian red wine', 'French rosé', 'Italian sparkling wine', 'Spanish white wine'],
    correct: 2,
  },
  {
    id: 7,
    question: 'Which country is the world\'s largest wine producer by volume?',
    options: ['France', 'Italy', 'Spain', 'United States'],
    correct: 1,
  },
  {
    id: 8,
    question: 'What does "Brut" mean on a Champagne label?',
    options: ['Very sweet', 'Medium sweet', 'Dry', 'Extra sweet'],
    correct: 2,
  },
  {
    id: 9,
    question: 'What grape makes Sancerre wine?',
    options: ['Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Viognier'],
    correct: 1,
  },
  {
    id: 10,
    question: 'What is the minimum alcohol content for most table wines?',
    options: ['5%', '8%', '12%', '15%'],
    correct: 1,
  },
  {
    id: 11,
    question: 'Which German wine term means "late harvest"?',
    options: ['Kabinett', 'Spätlese', 'Auslese', 'Eiswein'],
    correct: 1,
  },
  {
    id: 12,
    question: 'Which Australian region is famous for Shiraz?',
    options: ['Hunter Valley', 'Margaret River', 'Barossa Valley', 'Clare Valley'],
    correct: 2,
  },
  {
    id: 13,
    question: 'What does AOC stand for in French wine law?',
    options: ['Appellation d\'Origine Contrôlée', 'Age of Origin Certified', 'Association of Oenologists Certified', 'Area of Outstanding Character'],
    correct: 0,
  },
  {
    id: 14,
    question: 'Which grape is New Zealand most famous for?',
    options: ['Chardonnay', 'Riesling', 'Gewürztraminer', 'Sauvignon Blanc'],
    correct: 3,
  },
  {
    id: 15,
    question: 'What food is Champagne traditionally paired with?',
    options: ['Steak', 'Oysters', 'Pasta', 'Chocolate'],
    correct: 1,
  },
  {
    id: 16,
    question: 'What does "Reserva" on a Spanish wine label indicate?',
    options: ['It\'s sweet', 'Made from reserve grapes', 'Extra aging', 'Organic wine'],
    correct: 2,
  },
  {
    id: 17,
    question: 'Which wine is described as having "legs" when it sticks to the glass?',
    options: ['Low alcohol wine', 'Sparkling wine', 'High alcohol or sugar content wine', 'Aged white wine'],
    correct: 2,
  },
  {
    id: 18,
    question: 'What is the name of the bottle size that holds 1.5 liters?',
    options: ['Jeroboam', 'Magnum', 'Double Magnum', 'Methuselah'],
    correct: 1,
  },
  {
    id: 19,
    question: 'Which wine is traditionally served with turkey at Thanksgiving?',
    options: ['Cabernet Sauvignon', 'Pinot Noir', 'Syrah', 'Malbec'],
    correct: 1,
  },
  {
    id: 20,
    question: 'What does "terroir" refer to in wine?',
    options: ['The winemaker\'s technique', 'The natural environment where grapes grow', 'The age of the wine', 'The type of oak barrel used'],
    correct: 1,
  },
]
