import * as eslint from 'eslint'
import {
    lsp,
    Element,
    DiagnosticResult,
    VertexLabels,
    ElementTypes,
    Document,
    textDocument_diagnostic,
    EdgeLabels,
    E11,
    MetaData,
} from 'lsif-protocol'
import iterate from 'iterare'
import uuid from 'uuid/v4'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { TextDocument } from 'vscode-languageserver-textdocument'

// Include non-standard code actions
const EXPERIMENTAL_CODE_ACTIONS = Boolean(
    process.env.EXPERIMENTAL_CODE_ACTIONS && JSON.parse(process.env.EXPERIMENTAL_CODE_ACTIONS)
)

interface CodeActionResult extends Element {
    label: 'xcodeActionResult'
    result: lsp.CodeAction[]
}

interface FormatterData {
    rulesMeta: {
        [ruleId: string]: eslint.Rule.RuleMetaData
    }
}

const severities = {
    0: lsp.DiagnosticSeverity.Hint,
    1: lsp.DiagnosticSeverity.Warning,
    2: lsp.DiagnosticSeverity.Error,
}

const extensions: Record<string, string | undefined> = {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.json': 'json',
}

const lintMessageToDiagnostic = (lintMessage: eslint.Linter.LintMessage): lsp.Diagnostic => ({
    message: lintMessage.message,
    code: lintMessage.ruleId || undefined,
    severity: severities[lintMessage.severity],
    source: 'eslint',
    range: {
        start: {
            line: lintMessage.line - 1,
            character: lintMessage.column - 1,
        },
        end: {
            line: (lintMessage.endLine || lintMessage.line) - 1,
            character: (lintMessage.endColumn || lintMessage.column) - 1,
        },
    },
})

const lintMessageToCodeAction = (
    lintMessage: eslint.Linter.LintMessage,
    textDocument: TextDocument,
    diagnostic: lsp.Diagnostic,
    data: FormatterData
): lsp.CodeAction | undefined => {
    if (!lintMessage.fix) {
        return
    }
    // Convert offset to position
    const [start, end] = lintMessage.fix.range.map(offset => textDocument.positionAt(offset))

    let kind = lsp.CodeActionKind.QuickFix
    if (lintMessage.ruleId) {
        kind += '.' + data.rulesMeta[lintMessage.ruleId].type
    }

    return {
        title: `Fix ${lintMessage.message}`,
        kind,
        diagnostics: [diagnostic],
        edit: {
            documentChanges: [
                {
                    textDocument: {
                        uri: textDocument.uri,
                        version: null,
                    },
                    edits: [
                        {
                            range: { start, end },
                            newText: lintMessage.fix.text,
                        },
                    ],
                },
            ],
        },
    }
}

function* lintResultToLSIF(result: eslint.CLIEngine.LintResult, data: FormatterData): Iterable<Element> {
    if (result.messages.length === 0) {
        return
    }

    const document: Document = {
        id: uuid(),
        type: ElementTypes.vertex,
        label: VertexLabels.document,
        uri: pathToFileURL(result.filePath).href,
        languageId: extensions[path.extname(result.filePath)] || 'javascript',
    }
    yield document

    const textDocument = result.source ? TextDocument.create(document.uri, document.languageId, 0, result.source) : null

    const codeActions: lsp.CodeAction[] = []
    const diagnostics: lsp.Diagnostic[] = []
    for (const lintMessage of result.messages) {
        const diagnostic = lintMessageToDiagnostic(lintMessage)
        diagnostics.push(diagnostic)
        if (EXPERIMENTAL_CODE_ACTIONS && textDocument) {
            const codeAction = lintMessageToCodeAction(lintMessage, textDocument, diagnostic, data)
            if (codeAction) {
                codeActions.push(codeAction)
            }
        }
    }
    const diagnosticResult: DiagnosticResult = {
        id: uuid(),
        type: ElementTypes.vertex,
        label: VertexLabels.diagnosticResult,
        result: diagnostics,
    }
    yield diagnosticResult

    const documentToDiagnosticResult: textDocument_diagnostic = {
        id: uuid(),
        type: ElementTypes.edge,
        label: EdgeLabels.textDocument_diagnostic,
        inV: diagnosticResult.id,
        outV: document.id,
    }
    yield documentToDiagnosticResult

    if (codeActions.length > 0) {
        const codeActionResult: CodeActionResult = {
            id: uuid(),
            type: ElementTypes.vertex,
            label: 'xcodeActionResult',
            result: codeActions,
        }
        yield codeActionResult
        const documentToCodeActionResult: E11<any, any, any> = {
            id: uuid(),
            type: ElementTypes.edge,
            label: 'textDocument/xcodeAction',
            inV: codeActionResult.id,
            outV: document.id,
        }
        yield documentToCodeActionResult
    }
}

const formatter = (results: eslint.CLIEngine.LintResult[], data: FormatterData): string => {
    const metadata: MetaData = {
        id: uuid(),
        type: ElementTypes.vertex,
        label: VertexLabels.metaData,
        positionEncoding: 'utf-16',
        projectRoot: pathToFileURL(process.cwd() + '/').href,
        version: '0.4.0',
        toolInfo: {
            name: 'lsif-eslint',
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            version: require('../package.json').version,
            args: process.argv,
        },
    }
    return iterate([metadata])
        .concat(
            iterate(results)
                .map(result => lintResultToLSIF(result, data))
                .flatten()
        )
        .map(element => JSON.stringify(element))
        .join('\n')
}

export = formatter
