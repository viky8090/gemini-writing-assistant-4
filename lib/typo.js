/**
 * Typo.js - A Hunspell-compatible spellchecker
 * Simplified for browser/extension use
 * Supports: check(word), suggest(word)
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.Typo = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function Typo(dicPath, affPath, loadedCallback, options) {
        this.dictionaryTable = {};
        this.rules = {};
        this.dictionary = null;
        this.repTable = [];
        this.tryChars = '';
        this.flags = {};
        this.options = options || {};
        this.loaded = false;

        if (dicPath && affPath) {
            this.load(dicPath, affPath, loadedCallback);
        }
    }

    Typo.prototype.load = function (dicPath, affPath, callback) {
        const self = this;
        Promise.all([
            fetch(affPath).then(r => r.text()),
            fetch(dicPath).then(r => r.text())
        ]).then(([affData, dicData]) => {
            self.parseAff(affData);
            self.parseDic(dicData);
            self.loaded = true;
            if (callback) callback();
        }).catch(err => {
            console.error('Typo load error:', err);
        });
    };

    Typo.prototype.parseAff = function (data) {
        const lines = data.split(/\r?\n/);
        let ruleType = null;
        let rule = null;
        let ruleCount = 0;
        let lineCount = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line || line.startsWith('#') || line.startsWith('//')) continue;

            const parts = line.split(/\s+/);
            const directive = parts[0];

            if (directive === 'PFX' || directive === 'SFX') {
                if (parts.length >= 3) {
                    const flag = parts[1];
                    const cross = parts[2];
                    const count = parseInt(parts[3], 10);
                    ruleType = directive;
                    rule = {
                        type: directive,
                        flag: flag,
                        cross: cross === 'Y',
                        entries: []
                    };
                    ruleCount = count;
                    lineCount = 0;
                } else if (rule && lineCount < ruleCount) {
                    // continuation line
                    const match = line.match(/^(PFX|SFX)\s+\S+\s+(\d+)\s+(\S+)\s+(\S+)\s+(.+)/);
                    if (match) {
                        const strip = match[3] === '0' ? '' : match[3];
                        const add = match[4];
                        const condition = match[5].trim();
                        rule.entries.push({
                            strip: strip,
                            add: add,
                            condition: condition === '.' ? '.*' : this._escapeRegex(condition)
                        });
                        lineCount++;
                    }
                }
                if (rule && lineCount >= ruleCount) {
                    this.rules[rule.flag] = rule;
                    rule = null;
                }
            } else if (directive === 'REP') {
                const count = parseInt(parts[1], 10);
                let collected = 0;
                for (let j = i + 1; j < lines.length && collected < count; j++) {
                    const repLine = lines[j].trim();
                    if (!repLine || repLine.startsWith('#')) continue;
                    const repParts = repLine.split(/\s+/);
                    if (repParts.length >= 3 && repParts[0] === 'REP') {
                        this.repTable.push([repParts[1], repParts[2]]);
                        collected++;
                    }
                }
                i += count;
            } else if (directive === 'TRY') {
                this.tryChars = parts[1] || '';
            } else if (directive === 'NOSUGGEST') {
                this.flags.NOSUGGEST = parts[1];
            } else if (directive === 'COMPOUNDMIN') {
                this.flags.COMPOUNDMIN = parseInt(parts[1], 10);
            } else if (directive === 'ONLYINCOMPOUND') {
                this.flags.ONLYINCOMPOUND = parts[1];
            } else if (directive === 'COMPOUNDRULE') {
                // simplified: not fully supported for suggestions
            } else if (directive === 'WORDCHARS') {
                this.flags.WORDCHARS = parts[1];
            } else if (directive === 'ICONV') {
                // ignore for now
            }
        }
    };

    Typo.prototype._escapeRegex = function (str) {
        return str
            .replace(/\./g, '\\.')
            .replace(/\*/g, '\\*')
            .replace(/\+/g, '\\+')
            .replace(/\?/g, '\\?')
            .replace(/\^/g, '\\^')
            .replace(/\$/g, '\\$')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\|/g, '\\|')
            .replace(/\\/g, '\\\\');
    };

    Typo.prototype.parseDic = function (data) {
        const lines = data.split(/\r?\n/);
        if (lines.length === 0) return;
        const countLine = lines[0].trim().split(/\s+/);
        const wordCount = parseInt(countLine[0], 10);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#') || line.startsWith('//')) continue;
            const parts = line.split(/\//);
            const word = parts[0];
            const flags = parts[1] || '';
            this.dictionaryTable[word] = flags;

            // Pre-expand common forms for faster checking
            if (flags) {
                this._expandWord(word, flags);
            }
        }
    };

    Typo.prototype._expandWord = function (word, flags) {
        for (let i = 0; i < flags.length; i++) {
            const flag = flags[i];
            const rule = this.rules[flag];
            if (!rule) continue;
            for (let j = 0; j < rule.entries.length; j++) {
                const entry = rule.entries[j];
                const re = new RegExp(entry.condition + '$');
                if (re.test(word)) {
                    const newWord = word.replace(new RegExp(entry.strip + '$'), '') + entry.add;
                    if (newWord !== word) {
                        this.dictionaryTable[newWord] = this.dictionaryTable[newWord] || '';
                    }
                }
            }
        }
    };

    Typo.prototype.check = function (word) {
        if (!this.loaded) return true;
        if (!word || word.length === 0) return true;

        // Normalize
        let testWord = word;
        if (this.options.ignoreCase !== false) {
            testWord = word.toLowerCase();
        }

        // Direct lookup
        if (this.dictionaryTable.hasOwnProperty(testWord)) {
            const flags = this.dictionaryTable[testWord];
            if (flags && flags.includes(this.flags.NOSUGGEST)) {
                return false; // nosuggest words are treated as invalid for inline checking
            }
            return true;
        }

        // Check with suffix/prefix expansion for words that weren't pre-expanded
        return this._checkWithRules(testWord);
    };

    Typo.prototype._checkWithRules = function (word) {
        for (const flag in this.rules) {
            const rule = this.rules[flag];
            for (let i = 0; i < rule.entries.length; i++) {
                const entry = rule.entries[i];
                const addRe = new RegExp(this._escapeRegex(entry.add) + '$');
                if (addRe.test(word)) {
                    const stem = word.substring(0, word.length - entry.add.length) + entry.strip;
                    const stemRe = new RegExp(entry.condition + '$');
                    if (stemRe.test(stem) && this.dictionaryTable.hasOwnProperty(stem)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    Typo.prototype.suggest = function (word, limit) {
        if (!this.loaded) return [];
        limit = limit || 5;
        const original = word;
        word = word.toLowerCase();

        if (this.check(word)) return [];

        const suggestions = new Set();

        // 1. Apply REP table substitutions
        for (let i = 0; i < this.repTable.length; i++) {
            const [from, to] = this.repTable[i];
            if (word.includes(from)) {
                const candidate = word.replace(from, to);
                if (this.check(candidate)) suggestions.add(candidate);
            }
            if (word.includes(to)) {
                const candidate = word.replace(to, from);
                if (this.check(candidate)) suggestions.add(candidate);
            }
        }

        // 2. Edit distance 1 operations
        this._edits1(word).forEach(w => {
            if (this.check(w)) suggestions.add(w);
        });

        // 3. If still too few, try edit distance 2
        if (suggestions.size < limit) {
            const edits1 = this._edits1(word);
            for (let i = 0; i < edits1.length && suggestions.size < limit * 2; i++) {
                this._edits1(edits1[i]).forEach(w => {
                    if (this.check(w)) suggestions.add(w);
                });
            }
        }

        // 4. Filter out same-as-original and limit
        const result = Array.from(suggestions)
            .filter(w => w !== word && w !== original)
            .slice(0, limit);

        return result;
    };

    Typo.prototype._edits1 = function (word) {
        const edits = [];
        const len = word.length;
        const tryChars = this.tryChars || 'abcdefghijklmnopqrstuvwxyz';

        // Deletions
        for (let i = 0; i < len; i++) {
            edits.push(word.slice(0, i) + word.slice(i + 1));
        }
        // Transpositions
        for (let i = 0; i < len - 1; i++) {
            edits.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
        }
        // Replacements
        for (let i = 0; i < len; i++) {
            for (let j = 0; j < tryChars.length; j++) {
                edits.push(word.slice(0, i) + tryChars[j] + word.slice(i + 1));
            }
        }
        // Insertions
        for (let i = 0; i <= len; i++) {
            for (let j = 0; j < tryChars.length; j++) {
                edits.push(word.slice(0, i) + tryChars[j] + word.slice(i));
            }
        }
        return edits;
    };

    return Typo;
}));
