/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/menubar-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: MenubarBasic, MenubarWithSubmenu, MenubarSides, MenubarWithCheckboxes, MenubarWithRadio, MenubarWithIcons (+6 not shown) */

"use client"

import * as React from "react"


import { StockButton as Button } from "westchase-gi";
import { StockDialog as Dialog, StockDialogContent as DialogContent, StockDialogDescription as DialogDescription, StockDialogHeader as DialogHeader, StockDialogTitle as DialogTitle, StockDialogTrigger as DialogTrigger } from "westchase-gi";
import { StockMenubar as Menubar, StockMenubarCheckboxItem as MenubarCheckboxItem, StockMenubarContent as MenubarContent, StockMenubarGroup as MenubarGroup, StockMenubarItem as MenubarItem, StockMenubarLabel as MenubarLabel, StockMenubarMenu as MenubarMenu, StockMenubarRadioGroup as MenubarRadioGroup, StockMenubarRadioItem as MenubarRadioItem, StockMenubarSeparator as MenubarSeparator, StockMenubarShortcut as MenubarShortcut, StockMenubarSub as MenubarSub, StockMenubarSubContent as MenubarSubContent, StockMenubarSubTrigger as MenubarSubTrigger, StockMenubarTrigger as MenubarTrigger } from "westchase-gi";
import { FileIcon, FolderIcon, SaveIcon, CircleDashedIcon, BoldIcon, ItalicIcon, UnderlineIcon, ImageIcon, LinkIcon, TableIcon, SearchIcon, CheckIcon, TrashIcon, UserIcon, SettingsIcon, LogOutIcon, CopyIcon, ScissorsIcon, ClipboardPasteIcon } from "lucide-react"


export function MenubarBasic() {
  return (
    <Example title="Basic">
      <Menubar defaultOpen>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              New Window <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>New Incognito Window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

export function MenubarSides() {
  return (
    <Example title="Sides" containerClassName="col-span-2">
      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            "inline-start",
            "left",
            "top",
            "bottom",
            "right",
            "inline-end",
          ] as const
        ).map((side) => (
          <Menubar key={side}>
            <MenubarMenu>
              <MenubarTrigger className="capitalize">
                {side.replace("-", " ")}
              </MenubarTrigger>
              <MenubarContent side={side}>
                <MenubarGroup>
                  <MenubarItem>New Tab</MenubarItem>
                  <MenubarItem>New Window</MenubarItem>
                  <MenubarItem>New Incognito Window</MenubarItem>
                </MenubarGroup>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        ))}
      </div>
    </Example>
  )
}

export function MenubarWithSubmenu() {
  return (
    <Example title="With Submenu">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Email link</MenubarItem>
                <MenubarItem>Messages</MenubarItem>
                <MenubarItem>Notes</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

export function MenubarWithCheckboxes() {
  return (
    <Example title="With Checkboxes">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent className="w-64">
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>
              Always Show Full URLs
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Reload <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Format</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked>Strikethrough</MenubarCheckboxItem>
            <MenubarCheckboxItem>Code</MenubarCheckboxItem>
            <MenubarCheckboxItem>Superscript</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

export function MenubarWithRadio() {
  const [user, setUser] = React.useState("benoit")
  const [theme, setTheme] = React.useState("system")

  return (
    <Example title="With Radio">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Profiles</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={user} onValueChange={setUser}>
              <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
              <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
              <MenubarRadioItem value="luis">Luis</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Edit...</MenubarItem>
            <MenubarItem inset>Add Profile...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={theme} onValueChange={setTheme}>
              <MenubarRadioItem value="light">Light</MenubarRadioItem>
              <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
              <MenubarRadioItem value="system">System</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

export function MenubarWithIcons() {
  return (
    <Example title="With Icons">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <FileIcon
              />
              New File <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <FolderIcon
              />
              Open Folder
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <SaveIcon
              />
              Save <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>More</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarItem>
                <CircleDashedIcon
                />
                Settings
              </MenubarItem>
              <MenubarItem>
                <CircleDashedIcon
                />
                Help
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem variant="destructive">
                <CircleDashedIcon
                />
                Delete
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

function MenubarWithShortcuts() {
  return (
    <Example title="With Shortcuts">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              New Window <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Cut <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Copy <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Paste <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

function MenubarFormat() {
  return (
    <Example title="Format">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Format</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <BoldIcon
              />
              Bold <MenubarShortcut>⌘B</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <ItalicIcon
              />
              Italic <MenubarShortcut>⌘I</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <UnderlineIcon
              />
              Underline <MenubarShortcut>⌘U</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarCheckboxItem checked>Strikethrough</MenubarCheckboxItem>
            <MenubarCheckboxItem>Code</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem>Show Ruler</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>Show Grid</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>Zoom In</MenubarItem>
            <MenubarItem inset>Zoom Out</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

function MenubarInsert() {
  return (
    <Example title="Insert">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Insert</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>
                <ImageIcon
                />
                Media
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Image</MenubarItem>
                <MenubarItem>Video</MenubarItem>
                <MenubarItem>Audio</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              <LinkIcon
              />
              Link <MenubarShortcut>⌘K</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <TableIcon
              />
              Table
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent className="w-44">
            <MenubarItem>
              <SearchIcon
              />
              Find & Replace <MenubarShortcut>⌘F</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <CheckIcon
              />
              Spell Check
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

function MenubarDestructive() {
  return (
    <Example title="Destructive">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent className="w-40">
            <MenubarItem>
              <FileIcon
              />
              New File <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <FolderIcon
              />
              Open Folder
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <TrashIcon
              />
              Delete File <MenubarShortcut>⌘⌫</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Account</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <UserIcon
              />
              Profile
            </MenubarItem>
            <MenubarItem>
              <SettingsIcon
              />
              Settings
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <LogOutIcon
              />
              Sign out
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <TrashIcon
              />
              Delete
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

function MenubarInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menubar Example</DialogTitle>
            <DialogDescription>
              Use the menubar below to see the menu options.
            </DialogDescription>
          </DialogHeader>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <CopyIcon
                  />
                  Copy
                </MenubarItem>
                <MenubarItem>
                  <ScissorsIcon
                  />
                  Cut
                </MenubarItem>
                <MenubarItem>
                  <ClipboardPasteIcon
                  />
                  Paste
                </MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>More Options</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>Save Page...</MenubarItem>
                    <MenubarItem>Create Shortcut...</MenubarItem>
                    <MenubarItem>Name Window...</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Developer Tools</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem variant="destructive">
                  <TrashIcon
                  />
                  Delete
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </DialogContent>
      </Dialog>
    </Example>
  )
}

function MenubarWithInset() {
  const [showBookmarks, setShowBookmarks] = React.useState(true)
  const [showUrls, setShowUrls] = React.useState(false)
  const [theme, setTheme] = React.useState("system")

  return (
    <Example title="With Inset">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent className="w-44">
            <MenubarGroup>
              <MenubarLabel>Actions</MenubarLabel>
              <MenubarItem>
                <CopyIcon
                />
                Copy
              </MenubarItem>
              <MenubarItem>
                <ScissorsIcon
                />
                Cut
              </MenubarItem>
              <MenubarItem inset>Paste</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel inset>Appearance</MenubarLabel>
              <MenubarCheckboxItem
                inset
                checked={showBookmarks}
                onCheckedChange={setShowBookmarks}
              >
                Bookmarks
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                inset
                checked={showUrls}
                onCheckedChange={setShowUrls}
              >
                Full URLs
              </MenubarCheckboxItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel inset>Theme</MenubarLabel>
              <MenubarRadioGroup value={theme} onValueChange={setTheme}>
                <MenubarRadioItem inset value="light">
                  Light
                </MenubarRadioItem>
                <MenubarRadioItem inset value="dark">
                  Dark
                </MenubarRadioItem>
                <MenubarRadioItem inset value="system">
                  System
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger inset>More Options</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarGroup>
                  <MenubarItem>Save Page...</MenubarItem>
                  <MenubarItem>Create Shortcut...</MenubarItem>
                </MenubarGroup>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </Example>
  )
}

/* Local stand-in for the registry demo frame (src/components/stock/examples/
   example.tsx), which is gallery-only code. Same slots, no dependencies. */
function Example({ title, children, className = "" }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {title ? (
        <div className="px-1.5 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      ) : null}
      <div className={"flex min-w-0 flex-col items-start gap-6 rounded-xl bg-card p-6 text-foreground " + className}>
        {children}
      </div>
    </div>
  );
}
