import React, { useState } from 'react';
import { Command, CommandList, CommandItem, CommandShortcut } from '@/components/ui/command';

export const Guidelines = (_: { isUrdu: boolean }) => {
  type Shortcut = { id: string; action: string; keys: string[]; module: string; desc: string };

  const [shortcuts] = useState<Shortcut[]>([
    { id: 'pos_focus_search', keys: ['/'], action: 'POS: Focus search', module: 'pos', desc: 'Search medicine in POS quickly.' },
    { id: 'pos_checkout', keys: ['Ctrl', 'Enter'], action: 'POS: Process payment', module: 'pos', desc: 'Process the current cart payment.' },
    { id: 'pos_clear', keys: ['Ctrl', 'Shift', 'C'], action: 'POS: Clear cart', module: 'pos', desc: 'Clear all items from the cart.' },
    { id: 'pos_nav_up', keys: ['Arrow Up'], action: 'POS: Select previous cart item', module: 'pos', desc: 'Move selection up in cart list.' },
    { id: 'pos_nav_down', keys: ['Arrow Down'], action: 'POS: Select next cart item', module: 'pos', desc: 'Move selection down in cart list.' },
    { id: 'pos_inc', keys: ['+'], action: 'POS: Increase selected item qty', module: 'pos', desc: 'Increase quantity of selected cart item.' },
    { id: 'pos_dec', keys: ['-'], action: 'POS: Decrease selected item qty', module: 'pos', desc: 'Decrease quantity of selected cart item.' },
    { id: 'pos_remove', keys: ['Delete'], action: 'POS: Remove selected item', module: 'pos', desc: 'Remove the highlighted cart item.' },
    { id: 'inv_focus_search', keys: ['/', 'Shift', 'F'], action: 'Inventory: Focus search', module: 'inventory', desc: 'Quickly focus the inventory search bar.' },
  ]);
  const t = {
    title: 'Guidelines & Shortcuts',
    subtitle: 'How to use this software',
    shortcutsTitle: 'Keyboard Shortcuts',
  } as const;

  return (
    <div className="bg-white/70 dark:bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-6">
      <h3 className="text-sm font-medium mb-2">{t.title}</h3>
      <p className="text-xs text-gray-500 mb-4">{t.subtitle}</p>
      
      <div className="mb-4">
        <h4 className="text-xs font-medium mb-2">{t.shortcutsTitle}</h4>
        <Command>
          <CommandList>
            {shortcuts.map((sc, idx) => (
              <CommandItem key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div>
                    <div>{sc.action}</div>
                    <div className="text-[11px] text-gray-500">{sc.desc}</div>
                  </div>
                  <CommandShortcut>{sc.keys.join(' + ')}</CommandShortcut>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </div>
    </div>
  );
};
