// Lesson catalog. Each lesson defines:
// - metadata (slug, title, description, orderIndex)
// - markdown content shown to the user
// - setupSql: array of statements run against the user's own database when the
//   lesson is opened (idempotent: drops + recreates + seeds the lesson tables)
// - tables: tables created by setupSql (rendered in the lesson workspace)

export type LessonDefinition = {
  slug: string;
  title: string;
  description: string;
  orderIndex: number;
  content: string;
  setupSql: string[];
  tables: string[];
  starterSql: string;
};

export const LESSON_CATALOG: LessonDefinition[] = [
  {
    slug: "select-where",
    title: "SELECT and WHERE",
    description:
      "Read data from a table and filter rows with conditions.",
    orderIndex: 0,
    tables: ["employees"],
    starterSql: "SELECT * FROM employees;",
    content: `# SELECT and WHERE

In this lesson you will read data from a table using \`SELECT\` and filter
the rows you get back with \`WHERE\`.

The lesson workspace below already contains an \`employees\` table. The data
on the left is **live** — every query you run on the right is executed
against your own database.

## 1. SELECT all columns

The simplest query returns every column of every row:

\`\`\`sql
SELECT * FROM employees;
\`\`\`

## 2. SELECT specific columns

Pick only the columns you care about. The order of columns in the result
matches the order you list them.

\`\`\`sql
SELECT name, salary FROM employees;
\`\`\`

## 3. Filtering with WHERE

\`WHERE\` keeps only the rows that match a condition.

\`\`\`sql
SELECT name, department
FROM employees
WHERE department = 'Engineering';
\`\`\`

You can compare with \`=\`, \`<>\`, \`<\`, \`<=\`, \`>\`, \`>=\`.

\`\`\`sql
SELECT name, salary
FROM employees
WHERE salary >= 5000;
\`\`\`

## 4. Combining conditions

Use \`AND\` / \`OR\` / \`NOT\` to combine conditions:

\`\`\`sql
SELECT name, department, salary
FROM employees
WHERE department = 'Engineering' AND salary > 5500;
\`\`\`

## 5. Pattern matching with LIKE

\`LIKE\` searches text. \`%\` matches any sequence of characters.

\`\`\`sql
SELECT name, email
FROM employees
WHERE email LIKE '%@example.com';
\`\`\`

## Try it yourself

- Get all employees in the **Sales** department.
- Get the names and salaries of employees who earn **less than 4500**.
- Get everyone hired in **2023** (use \`hired_at >= '2023-01-01' AND hired_at < '2024-01-01'\`).

When you're done, mark the lesson as completed.`,
    setupSql: [
      `DROP TABLE IF EXISTS employees CASCADE;`,
      `CREATE TABLE employees (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        department  VARCHAR(50)  NOT NULL,
        salary      INTEGER      NOT NULL,
        hired_at    DATE         NOT NULL
      );`,
      `INSERT INTO employees (name, email, department, salary, hired_at) VALUES
        ('Ana Popescu',     'ana.popescu@example.com',     'Engineering', 6200, DATE '2022-03-14'),
        ('Mihai Ionescu',   'mihai.ionescu@example.com',   'Engineering', 5800, DATE '2023-01-09'),
        ('Elena Radu',      'elena.radu@example.com',      'Engineering', 4900, DATE '2023-07-22'),
        ('Cristian Marin',  'cristian.marin@example.com',  'Sales',       4200, DATE '2021-11-02'),
        ('Diana Stoica',    'diana.stoica@example.com',    'Sales',       4600, DATE '2023-05-16'),
        ('Vlad Georgescu',  'vlad.g@example.com',          'Marketing',   3900, DATE '2022-08-30'),
        ('Raluca Dinu',     'raluca.dinu@example.com',     'Marketing',   4400, DATE '2024-02-04'),
        ('Andrei Pop',      'andrei.pop@example.com',      'HR',          4100, DATE '2020-09-12'),
        ('Sorina Dumitru',  'sorina.dumitru@example.com',  'HR',          3700, DATE '2023-10-25'),
        ('George Lazar',    'george.lazar@example.com',    'Engineering', 7000, DATE '2019-04-01');`,
    ],
  },
];

export function getLesson(slug: string): LessonDefinition | undefined {
  return LESSON_CATALOG.find((l) => l.slug === slug);
}
