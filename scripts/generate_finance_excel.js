import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read extracted paragraphs
const rawText = fs.readFileSync(path.join(__dirname, '../docs/extracted_paragraphs.txt'), 'utf-8');
const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

function decodeXml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2013;/g, '–')
    .replace(/&#x2014;/g, '—')
    .replace(/&#x2018;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"')
    .replace(/&#x201D;/g, '"')
    .trim();
}

const questions = [];
let currentQ = null;
let currentCluster = "Finance Fundamentals & Business Process";

for (let i = 0; i < lines.length; i++) {
  const line = decodeXml(lines[i]);

  // Stop if reaching the final assessment structure summary table
  if (/^Final Assessment Structure/i.test(line)) {
    break;
  }

  if (/^CLUSTER\s+\d+:/i.test(line)) {
    currentCluster = line.replace(/^CLUSTER\s+\d+:\s*/i, '').trim();
    continue;
  }

  const qMatch = line.match(/^Q(\d+)[\.\:]\s*(.+)/i);
  if (qMatch) {
    if (currentQ) {
      questions.push(currentQ);
    }
    currentQ = {
      qNum: parseInt(qMatch[1], 10),
      prompt: qMatch[2].trim(),
      cluster: currentCluster,
      options: {},
      correctAnswer: 'A',
      explanation: null,
    };
    continue;
  }

  if (currentQ) {
    const optMatch = line.match(/^([A-D])[\.\:]\s*(.+)/i);
    if (optMatch) {
      const optLetter = optMatch[1].toUpperCase();
      currentQ.options[optLetter] = optMatch[2].trim();
      continue;
    }

    const ansMatch = line.match(/^Correct\s*Answer\s*[\:\-]\s*([A-D])/i);
    if (ansMatch) {
      currentQ.correctAnswer = ansMatch[1].toUpperCase();
      continue;
    }

    const expMatch = line.match(/^Explanation\s*[\:\-]\s*(.+)/i);
    if (expMatch) {
      currentQ.explanation = expMatch[1].trim();
      continue;
    }

    // Append continuation text
    if (Object.keys(currentQ.options).length === 0) {
      currentQ.prompt += ' ' + line;
    } else if (currentQ.options['D'] && !currentQ.correctAnswer) {
      currentQ.options['D'] += ' ' + line;
    } else if (currentQ.options['C'] && !currentQ.options['D']) {
      currentQ.options['C'] += ' ' + line;
    } else if (currentQ.options['B'] && !currentQ.options['C']) {
      currentQ.options['B'] += ' ' + line;
    } else if (currentQ.options['A'] && !currentQ.options['B']) {
      currentQ.options['A'] += ' ' + line;
    }
  }
}

if (currentQ) {
  questions.push(currentQ);
}

console.log(`Extracted total questions: ${questions.length}`);

// 2. Build rows for Excel
const excelRows = questions.map((q, idx) => {
  const optA = q.options['A'] || '';
  const optB = q.options['B'] || '';
  const optC = q.options['C'] || '';
  const optD = q.options['D'] || '';

  // Determine correct option number (A -> 1, B -> 2, C -> 3, D -> 4)
  let correctOptNum = "1";
  if (q.correctAnswer === 'B') correctOptNum = "2";
  else if (q.correctAnswer === 'C') correctOptNum = "3";
  else if (q.correctAnswer === 'D') correctOptNum = "4";

  // Create clean short title
  let shortTitle = q.prompt.length > 60 ? q.prompt.substring(0, 57) + '...' : q.prompt;

  return {
    Title: `Q${q.qNum || idx + 1}: ${shortTitle}`,
    Type: "MCQ",
    Subject: "Finance",
    Topic: "",
    Subtopic: "",
    Difficulty: (idx < 15) ? "EASY" : (idx < 45) ? "MEDIUM" : "HARD",
    Marks: 1,
    Prompt: q.prompt,
    "Question Image URL": "",
    "Option 1": optA,
    "Option 1 Image URL": "",
    "Option 2": optB,
    "Option 2 Image URL": "",
    "Option 3": optC,
    "Option 3 Image URL": "",
    "Option 4": optD,
    "Option 4 Image URL": "",
    "Correct Option": correctOptNum,
    Tags: `Finance, ${q.cluster.toLowerCase().replace(/&amp;/g, '&')}`,
    "Avg Time (s)": 90,
  };
});

// 3. Create Worksheet
const wsQuestions = XLSX.utils.json_to_sheet(excelRows);

// Set column widths
wsQuestions["!cols"] = [
  { wch: 35 }, // Title
  { wch: 10 }, // Type
  { wch: 18 }, // Subject
  { wch: 18 }, // Topic
  { wch: 18 }, // Subtopic
  { wch: 12 }, // Difficulty
  { wch: 8 },  // Marks
  { wch: 60 }, // Prompt
  { wch: 22 }, // Question Image URL
  { wch: 30 }, // Option 1
  { wch: 22 }, // Option 1 Image URL
  { wch: 30 }, // Option 2
  { wch: 22 }, // Option 2 Image URL
  { wch: 30 }, // Option 3
  { wch: 22 }, // Option 3 Image URL
  { wch: 30 }, // Option 4
  { wch: 22 }, // Option 4 Image URL
  { wch: 15 }, // Correct Option
  { wch: 35 }, // Tags
  { wch: 14 }, // Avg Time (s)
];

// 4. Create Taxonomy Reference Sheet
const taxonomyRows = [
  {
    "Subject Name": "Finance",
    "Topic Name": "(No topics yet)",
    "Subtopic Name": "(No subtopics yet)",
  },
];
const wsTaxonomy = XLSX.utils.json_to_sheet(taxonomyRows);
wsTaxonomy["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 24 }];

// 5. Create Workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, wsQuestions, "MCQ_Questions");
XLSX.utils.book_append_sheet(wb, wsTaxonomy, "Taxonomy_Reference");

// 6. Write out Excel file
const outPath1 = path.join(__dirname, '../docs/Finance_60_MCQs_Import.xlsx');
const outPath2 = path.join(__dirname, '../Finance_60_MCQs_Import.xlsx');

XLSX.writeFile(wb, outPath1);
XLSX.writeFile(wb, outPath2);

console.log(`✅ Excel file generated successfully!`);
console.log(`Saved to:\n1. ${outPath1}\n2. ${outPath2}`);
