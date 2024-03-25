import { Tag } from "@/utils/galleryInterfaces";
import { Dispatch, SetStateAction, createContext } from "react";

type InputValueContextType = {
  inputValue: Tag[];
  setInputValue: Dispatch<SetStateAction<Tag[]>>;
};

export const InputValueContext = createContext<
  InputValueContextType | undefined
>(undefined);
