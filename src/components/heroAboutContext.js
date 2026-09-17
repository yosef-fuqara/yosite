import { createContext, useContext } from "react";

export const HeroAboutContext = createContext({
  transitionProgress: 0,
  transitionComplete: false,
});

export function useHeroAbout() {
  return useContext(HeroAboutContext);
}
