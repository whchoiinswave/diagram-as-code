import { ChevronDown, ChevronLeft, ChevronRight, FileCode2, Folder, FolderOpen, Save } from 'lucide-react';
import { useRef } from 'react';
import { listSupportedExtensions } from '../../workspace/file-filters';
import { buildFileTree, type FileTreeNode } from '../../workspace/tree';
import type { DiagramFile } from '../../workspace/storage-provider';

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

type WorkspaceShellProps = {
  files: DiagramFile[];
  activeUri: string | null;
  rootLabel: string;
  rootInput: string;
  saveStatus: SaveStatus;
  onRootInputChange: (value: string) => void;
  onLoadSample: () => void;
  onImportFiles: (files: FileList) => void;
  onSelectFile: (file: DiagramFile) => void;
  onNavigate: (direction: 'previous' | 'next') => void;
  onSave: () => void;
};

function TreeNodeView({
  node,
  activeUri,
  depth,
  onSelectFile,
}: {
  node: FileTreeNode;
  activeUri: string | null;
  depth: number;
  onSelectFile: (file: DiagramFile) => void;
}) {
  if (node.kind === 'folder') {
    return (
      <div className="tree-folder">
        <div className="tree-folder-label" style={{ paddingLeft: `${8 + depth * 12}px` }}>
          <ChevronDown size={13} aria-hidden="true" />
          <Folder size={14} aria-hidden="true" />
          <span>{node.name}</span>
        </div>
        {node.children.map((child) => (
          <TreeNodeView
            key={child.id}
            node={child}
            activeUri={activeUri}
            depth={depth + 1}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      className={node.file.uri === activeUri ? 'file-row is-selected' : 'file-row'}
      type="button"
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      onClick={() => onSelectFile(node.file)}
    >
      <FileCode2 size={15} aria-hidden="true" />
      <span>{node.file.relativePath}</span>
    </button>
  );
}

export function WorkspaceShell({
  files,
  activeUri,
  rootLabel,
  rootInput,
  saveStatus,
  onRootInputChange,
  onLoadSample,
  onImportFiles,
  onSelectFile,
  onNavigate,
  onSave,
}: WorkspaceShellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const tree = buildFileTree(files);

  return (
    <aside className="workspace-shell" aria-label="Workspace files">
      <div className="workspace-root">
        <FolderOpen size={16} aria-hidden="true" />
        <span>{rootLabel}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </div>

      <div className="workspace-controls">
        <input
          className="root-input"
          aria-label="Workspace root"
          value={rootInput}
          placeholder="workspace root"
          onChange={(event) => onRootInputChange(event.target.value)}
        />
        <div className="workspace-actions">
          <button className="small-button" type="button" onClick={onLoadSample}>
            Sample
          </button>
          <button className="small-button" type="button" onClick={() => inputRef.current?.click()}>
            Files
          </button>
          <input
            ref={inputRef}
            className="hidden-file-input"
            type="file"
            multiple
            accept=".mmd,.mermaid,.md,.mdx,.d2,.puml,.plantuml,.dot,.gv,.structurizr,.dbml,text/plain,text/markdown"
            onChange={(event) => {
              const selected = event.currentTarget.files;
              if (selected && selected.length > 0) {
                onImportFiles(selected);
                event.currentTarget.value = '';
              }
            }}
          />
        </div>
        <div className="workspace-actions">
          <button className="icon-button" type="button" title="Previous file" onClick={() => onNavigate('previous')}>
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" title="Next file" onClick={() => onNavigate('next')}>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <button
            className={saveStatus === 'dirty' ? 'icon-button is-active' : 'icon-button'}
            type="button"
            title="Save active file"
            disabled={saveStatus === 'saving'}
            onClick={onSave}
          >
            <Save size={15} aria-hidden="true" />
          </button>
        </div>
        <div className={`save-status save-status-${saveStatus}`}>{saveStatus}</div>
      </div>

      <nav className="file-list">
        {tree.length === 0 ? (
          <div className="empty-tree">No diagram files</div>
        ) : (
          tree.map((node) => (
            <TreeNodeView
              key={node.id}
              node={node}
              activeUri={activeUri}
              depth={0}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </nav>

      <div className="extension-strip">
        {listSupportedExtensions().map((extension) => (
          <span key={extension}>{extension}</span>
        ))}
      </div>
    </aside>
  );
}
