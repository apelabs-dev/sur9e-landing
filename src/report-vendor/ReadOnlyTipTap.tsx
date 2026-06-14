'use client';

// READ-ONLY TipTap renderer — vendored from the product's tiptap-editor.tsx.
//
// The product editor (src/components/editor/tiptap-editor.tsx) is mostly
// EDITING chrome: DragHandle, BubbleMenu, the slash menu, block/link/callout
// popovers, table hover menus, image upload. A read-only render needs NONE of
// that. It needs only the *rendering* extension set, which is exactly the array
// returned by that file's buildExtensions(). Using the identical extension set
// with editable:false yields byte-identical rendered DOM with a far smaller
// closure.
//
// buildExtensions() below is copied VERBATIM from product tiptap-editor.tsx
// (lines ~170-250), with two differences, both safe for read-only:
//   * SlashCommand.configure(...) is DROPPED — it is editing-only (the "/"
//     command popup) and never affects rendered output.
//   * Placeholder is KEPT — it is `showOnlyWhenEditable:true`, so it no-ops in
//     a read-only editor.
// DragHandle / BubbleMenu were added separately inside the product's
// useEditor() call (NOT in buildExtensions), so they are simply absent here.

import CharacterCount from '@tiptap/extension-character-count';
import { Color } from '@tiptap/extension-color';
import { DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { TextStyle } from '@tiptap/extension-text-style';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { CalloutNode } from './extensions/callout-node';
import { CodeBlockWithChrome } from './extensions/code-block-view';
import { DetailsBlock } from './extensions/details-block';
import { FitColorizer } from './extensions/fit-colorizer';
import { HeadingId } from './extensions/heading-id';
import { RunningMode } from './extensions/running-mode-node';
import { SnapshotNode } from './extensions/snapshot-node';
import { StableImage } from './extensions/stable-image';

const lowlight = createLowlight(common);
// `text` / `plaintext` must render with NO syntax highlighting. They aren't in
// the `common` grammar set, so without this CodeBlockLowlight falls back to
// highlightAuto() and colors random words. Register them as no-op grammars.
const plaintextGrammar = () => ({ name: 'plaintext', disableAutodetect: true, contains: [] });
lowlight.register({ text: plaintextGrammar, plaintext: plaintextGrammar, txt: plaintextGrammar });

function buildExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      // Disabled in favor of CodeBlockLowlight below.
      codeBlock: false,
      horizontalRule: { HTMLAttributes: { class: 'be-hr' } },
      // Disable the bundled link in favor of the standalone extension.
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    TaskList.configure({ HTMLAttributes: { class: 'be-todo' } }),
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true, HTMLAttributes: { class: 'be-table' } }),
    TableRow,
    TableHeader,
    TableCell,
    StableImage.configure({ HTMLAttributes: { class: 'be-image' } }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    CharacterCount.configure({ limit: 50000 }),
    CodeBlockWithChrome.configure({
      lowlight,
      defaultLanguage: 'text',
      HTMLAttributes: { class: 'be-codeblock' },
    }),
    FitColorizer,
    HeadingId,
    DetailsBlock.configure({
      persist: true,
      HTMLAttributes: { class: 'be-details' },
    }),
    DetailsSummary,
    DetailsContent,
    RunningMode,
    SnapshotNode,
    CalloutNode,
    Placeholder.configure({
      placeholder: ({ node }: { node: PMNode }) =>
        node.type.name === 'codeBlock'
          ? ''
          : placeholder || "Type '/' for commands or just start writing…",
      includeChildren: false,
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
    }),
    // SlashCommand intentionally dropped (editing-only).
    // Markdown extension MUST be last so its serializer sees the final list.
    Markdown.configure({
      html: true,
      tightLists: true,
      linkify: false,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ];
}

export function ReadOnlyTipTap({ body }: { body: string }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: buildExtensions(),
    content: body,
    editorProps: { attributes: { class: 'be-prose' } },
  });

  return <EditorContent editor={editor} />;
}
