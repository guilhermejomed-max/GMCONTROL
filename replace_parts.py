with open('components/ServiceOrderHub.tsx', 'r') as f:
    content = f.read()

target = """                           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                               <Package className="h-4 w-4 text-blue-500"/> Peças do Almoxarifado
                           </label>
                           
                           <div className="grid grid-cols-1 gap-2">"""

replacement = """                           <label className="flex items-center gap-2 cursor-pointer mb-1">
                               <input 
                                   type="checkbox" 
                                   checked={includeParts}
                                   onChange={e => setIncludeParts(e.target.checked)}
                                   className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                               />
                               <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                                   <Package className="h-4 w-4 text-blue-500"/> Incluir Peças
                               </span>
                           </label>
                           
                           {includeParts && (
                               <div className="grid grid-cols-1 gap-2">"""

# Replace only the first occurrence
new_content = content.replace(target, replacement, 1)

with open('components/ServiceOrderHub.tsx', 'w') as f:
    f.write(new_content)
