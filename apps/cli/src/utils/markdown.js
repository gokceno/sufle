const allowedTypes = ["pdf", "docx", "txt", "md"];
const executableName = "markitdown";

const convert = (fileContents, { logger }) => {
  if (typeof fileContents === "string") {
    return fileContents;
  }
  if (typeof Bun === "undefined") {
    throw new Error("This process requires Bun.");
  }
  const executableCheck = Bun.spawnSync(["which", executableName]);
  if (executableCheck.exitCode !== 0) {
    throw new Error(`${executableName} is not installed`);
  }
  const proc = Bun.spawnSync([executableName], { stdin: fileContents });
  const out = proc.stdout.toString();
  if (!out) {
    logger.warn(`File cannot be converted to Markdown or is empty.`);
  }
  return toPlainText(out);
};

const toPlainText = (markdown) => {
  return (
    markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove headings
      .replace(/^#+\s+/gm, "")
      // Remove images
      .replace(
        /!$begin:math:display$.*?$end:math:display$$begin:math:text$.*?$end:math:text$/g,
        ""
      )
      // Remove base64 encoded inline images
      .replace(/!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/g, "")
      // Remove all markdown images (including those with alt text)
      .replace(/!\[.*?\]\([^)]+\)/g, "")
      // Remove links but keep the link text
      .replace(
        /$begin:math:display$([^$end:math:display$]+)\]$begin:math:text$.*?$end:math:text$/g,
        "$1"
      )
      // Remove blockquotes
      .replace(/>\s+/g, "")
      // Remove unordered list markers (-, *, +)
      .replace(/^\s*[-*+]\s+/gm, "")
      // Remove ordered list numbers (e.g., "1. ")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove horizontal rules
      .replace(/^---$/gm, "")
      // Replace multiple newlines with a single newline
      .replace(/\n{2,}/g, "\n")
      // Trim leading and trailing whitespace
      .trim()
  );
};

export { convert, allowedTypes, toPlainText };
