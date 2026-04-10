declare module "pokersolver" {
  export interface SolvedHand {
    name: string;
    rank: number;
    descr: string;
    cards: string[];
    toString(): string;
  }

  export interface HandConstructor {
    solve(cards: string[]): SolvedHand;
    winners(hands: SolvedHand[]): SolvedHand[];
  }

  export const Hand: HandConstructor;
}
