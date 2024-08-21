import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const DEFAULT_SEPARATORS = [
  "\nenum ",
  "\ninterface ",
  "\nnamespace ",
  "\ntype ",
  "\nclass ",
  "\nfunction ",
  "\nconst ",
  "\nlet ",
  "\nvar ",
  "\nif ",
  "\nfor ",
  "\nwhile ",
  "\nswitch ",
  "\ncase ",
  "\ndefault ",
  "\n\n",
  "\n",
  " ",
  "",
];

export default class TypescriptSplitter extends RecursiveCharacterTextSplitter {
  constructor(
    fields?: Partial<{
      chunkSize: number;
      chunkOverlap: number;
      separators: readonly string[];
    }>
  ) {
    const separators = fields?.separators
      ? [...DEFAULT_SEPARATORS, ...fields.separators]
      : DEFAULT_SEPARATORS;

    super({ ...fields, separators });
  }
}
