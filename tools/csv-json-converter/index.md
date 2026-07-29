---
title: CSV to JSON Converter
url: https://tools.usappteam.com/tools/csv-json-converter/
date: 2026-07-30
---

# CSV to JSON Converter

A free browser tool that converts CSV to JSON and JSON back to CSV. The parser is plain JavaScript
running inside your own browser tab, so the file is never uploaded, never stored, and never seen by
anyone else — which matters, because the CSVs people actually convert are customer lists, order
exports and payroll runs.

## How to use it

1. **Pick a direction** — CSV to JSON, or JSON to CSV.
2. **Paste the data**, or drop a `.csv`, `.tsv`, `.txt` or `.json` file onto the input box. Dropping a
   `.json` file switches the direction automatically. The filename, size and row count are shown once
   it loads.
3. **Check the delimiter.** Auto-detect chooses between comma, semicolon, tab and pipe and tells you
   what it found; override it from the dropdown if it guessed wrong.
4. **Set the two toggles** — whether the first row is a header, and whether to infer types.
5. **Read the table preview** (first 50 rows, scrolling inside its own container) and any warnings.
6. **Copy or download** the result. Both happen entirely on your machine.

## Why CSV is harder than it looks

CSV has no single official specification. RFC 4180 describes the common shape, but every tool that
writes CSV bends it slightly, and the differences are exactly where converters lose data.

**Quoting and escaping.** A field may be wrapped in double quotes, and a quoted field may contain the
delimiter, a carriage return, a line feed, or a double quote escaped by doubling it. So
`"Knuth, Donald"` is one field, not two. A postal address split over three lines is one cell, not
three rows. `"Said ""ship it"" twice"` is the single value `Said "ship it" twice`. Any converter that
splits on commas with `line.split(",")` gets all three of these wrong, and the damage is invisible
until someone downstream notices the addresses are shredded.

**Delimiters differ by locale.** Excel writes the list separator of the operating system's locale.
In much of Europe the comma is the decimal separator, so Excel writes semicolons instead — a German
or French export of the same spreadsheet is a `;` file. Tab-separated exports come out of databases
and Google Sheets, and pipe-separated files are common from older mainframe and banking systems. A
converter that assumes commas turns a semicolon file into a single column of nonsense. This tool
scores comma, semicolon, tab and pipe on the number of fields produced and how consistent the row
widths are, picks the winner, and shows you which one it chose.

**Line endings and the BOM.** Windows tools write CRLF, Unix tools write LF, and both must parse
identically — including a CRLF *inside* a quoted field. Excel also writes a UTF-8 byte order mark at
the start of the file. If it is not stripped, the first column comes out named `﻿name` instead
of `name`, and every lookup against that key silently fails.

**The leading-zero and big-number traps.** This is the most common way a converter corrupts real
data. If a tool converts every numeric-looking cell to a JSON number, ZIP code `02134` becomes
`2134`, product code `007` becomes `7`, and a 20-digit order ID gets rounded, because JavaScript
numbers only hold integers exactly up to 9,007,199,254,740,991. `1.0` becomes `1`, which loses the
fact that the source recorded one decimal place. The rule used here is simple and safe: **a cell only
becomes a number if the number can be written back out as exactly the same text.** Under that rule
`42`, `-7` and `3.14` convert; `02134`, `007`, `1.0`, `2.50`, `+5`, `1e5`, `12345678901234567890` and
anything with surrounding whitespace stay strings. `true` and `false` become booleans, and an empty
cell becomes `null`. Turning type inference off keeps every value as a string, which is the right
choice when you are moving data between systems rather than computing with it.

**Headers and ragged rows.** Real files have duplicate column names, blank column names, and rows
with the wrong number of fields — usually because a comma slipped into a free-text field unquoted.
Duplicate names are disambiguated with a numeric suffix (`email`, `email_2`) rather than overwriting
each other; blank names become `column_3`. Short rows get `null` for the missing keys, long rows keep
the extras under `column_8`, `column_9` and so on, and every ragged row is reported as a warning with
its line number so you can go back and look at the source.

## How nested JSON maps to flat columns

Going the other way, JSON is a tree and CSV is a rectangle, so something has to give.

- **Objects flatten with dot notation.** `{"address": {"city": "Boston"}}` becomes a column named
  `address.city`. Nesting can go as deep as the data does: `billing.address.postcode`.
- **Arrays are serialised as JSON text**, because expanding them would require inventing extra rows.
  `["vip","email-only"]` is written as that exact string. It is unambiguous and reads straight back.
- **The header is the union of all keys**, in first-seen order. A key that appears only on record 40
  still gets a column; records that do not have it get an empty cell, and the count of filled-in gaps
  is reported.
- **A single object** is treated as one row. A bare value or an array of primitives goes into one
  column named `value`.
- **`null` becomes an empty cell**, booleans become `true`/`false`, numbers are written as-is.
- **Output is quoted per RFC 4180**: a field is wrapped in double quotes if it contains the
  delimiter, a quote, a line break or leading/trailing whitespace, and embedded quotes are doubled.
  Rows are separated with CRLF.

## Privacy

Everything runs locally. There is no upload, no server call, no account, and nothing is stored. Load
the page, disconnect from the internet, and every feature still works — that is the easiest way to
verify the claim yourself.

## Questions

**Is my file uploaded anywhere?** No. The parser runs in your browser tab and the data never crosses
the network.

**Why did another converter eat my ZIP code's leading zero?** It converted every numeric-looking cell
to a number, and numbers have no leading zeros. Here, `02134` stays a string.

**Does semicolon CSV from European Excel work?** Yes — auto-detect covers comma, semicolon, tab and
pipe, and you can override it.

**How are nested objects handled?** Flattened with dot notation (`address.city`); arrays are written
as JSON text.

**What happens to rows with the wrong field count?** They are converted and reported with their line
numbers, never silently dropped.

## About US APP Team

US APP Team builds custom mobile apps for founders and small businesses — idea to live on the App
Store and Google Play, done for you, at a fixed price, and you own everything. Start a brief at
https://usappteam.com/app-brief or book a free intro call at https://usappteam.com/book-call
