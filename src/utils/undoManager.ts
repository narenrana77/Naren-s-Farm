import {
  FarmDataStore,
  DeletedHistoryEntry,
  DeletedItemCategory,
  AcreSubPlot,
} from '../types/farm';
import { formatDateDDMMYYYY } from './acreUtils';

export const MAX_UNDO_HISTORY = 20;

export const CATEGORY_LABELS: Record<
  DeletedItemCategory,
  { labelHi: string; labelEn: string; icon: string }
> = {
  acre_expense: {
    labelHi: 'प्रति-एकड़ खर्च (Per-Acre Expense)',
    labelEn: 'Per-Acre Expense',
    icon: '🚜',
  },
  machinery: {
    labelHi: 'मशीनरी खर्च (Machinery Ledger)',
    labelEn: 'Machinery Expense',
    icon: '🚜',
  },
  labour: {
    labelHi: 'मजदूरी खर्च (Labour Ledger)',
    labelEn: 'Labour Expense',
    icon: '👷',
  },
  material: {
    labelHi: 'खाद-बीज व स्प्रे (Materials Ledger)',
    labelEn: 'Seed / Fertiliser / Spray',
    icon: '🌱',
  },
  aadti: {
    labelHi: 'मंडी आढ़ती खाता (Mandi Aadti)',
    labelEn: 'Mandi Aadti Entry',
    icon: '🏛️',
  },
  plot: {
    labelHi: 'पूरा खेत (Marked Khet Plot)',
    labelEn: 'Farm Plot (Khet)',
    icon: '🛰️',
  },
  acre_subplot: {
    labelHi: 'एकड़ चक (Marked Acre)',
    labelEn: 'Acre Sub-Plot',
    icon: '📐',
  },
  task: {
    labelHi: 'कृषि कार्य रिमाइंडर (Farm Task)',
    labelEn: 'Farm Task',
    icon: '🔔',
  },
};

const recalculateAcreExpenses = (acre: AcreSubPlot): AcreSubPlot => {
  const entries = acre.expenseEntries || [];
  const machExp = entries
    .filter((e) => e.category === 'machinery')
    .reduce((acc, e) => acc + e.totalAmount, 0);
  const labExp = entries
    .filter((e) => e.category === 'labour')
    .reduce((acc, e) => acc + e.totalAmount, 0);
  const matExp = entries
    .filter((e) => e.category === 'chemical_seed')
    .reduce((acc, e) => acc + e.totalAmount, 0);
  const totalExp = machExp + labExp + matExp;

  return {
    ...acre,
    machineryExpense: machExp,
    labourExpense: labExp,
    materialExpense: matExp,
    allocatedExpense: totalExp,
  };
};

/**
 * Automatically detects any deleted Plots, Acres, Per-Acre Expenses,
 * Machinery/Labour/Material/Aadti ledger entries, or Tasks between prevStore and nextStore,
 * synchronizes linked Per-Acre/Machinery deletions, and records them in nextStore.deletedHistory (up to 20 items).
 */
export function detectAndRecordDeletions(
  prevStore: FarmDataStore,
  nextStore: FarmDataStore
): {
  updatedStore: FarmDataStore;
  newlyDeletedEntries: DeletedHistoryEntry[];
} {
  const newlyDeletedEntries: DeletedHistoryEntry[] = [];
  const nowIso = new Date().toISOString();
  const capturedMachineryIds = new Set<string>();

  // Clone plots so we can also clean up linked Per-Acre entries if a MachineryRecord was deleted from Hisab-Kitab
  let workingPlots = nextStore.plots.map((p) => ({
    ...p,
    subPlots: p.subPlots ? [...p.subPlots] : undefined,
  }));

  // 1. Check for deleted FarmPlots (Entire Khets)
  const nextPlotIds = new Set(workingPlots.map((p) => p.id));
  for (const prevPlot of prevStore.plots || []) {
    if (!nextPlotIds.has(prevPlot.id)) {
      const plotTotalExp = (prevPlot.subPlots || []).reduce(
        (sum, s) =>
          sum +
          ((Number(s.machineryExpense) || 0) +
            (Number(s.labourExpense) || 0) +
            (Number(s.materialExpense) || 0) ||
            Number(s.allocatedExpense) ||
            0),
        0
      );
      newlyDeletedEntries.push({
        id: `del_plot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'plot',
        title: `खेत: ${prevPlot.name}`,
        subtitle: `${prevPlot.acres} एकड़ · ${
          prevPlot.subPlots?.length || 0
        } चक · ${prevPlot.crop}`,
        amount: plotTotalExp > 0 ? plotTotalExp : undefined,
        deletedAt: nowIso,
        payload: {
          plot: prevPlot,
        },
      });
    }
  }

  // 2. Check for deleted AcreSubPlots or deleted AcreExpenseEntries inside surviving Plots
  for (const prevPlot of prevStore.plots || []) {
    const currPlotIdx = workingPlots.findIndex((p) => p.id === prevPlot.id);
    if (currPlotIdx === -1) continue;
    const currPlot = workingPlots[currPlotIdx];

    const prevSubs = prevPlot.subPlots || [];
    const currSubs = currPlot.subPlots || [];
    const currSubIds = new Set(currSubs.map((s) => s.id));

    for (const prevSub of prevSubs) {
      if (!currSubIds.has(prevSub.id)) {
        // Entire Acre Sub-Plot was deleted
        const acreExp =
          (Number(prevSub.machineryExpense) || 0) +
            (Number(prevSub.labourExpense) || 0) +
            (Number(prevSub.materialExpense) || 0) ||
          Number(prevSub.allocatedExpense) ||
          0;
        newlyDeletedEntries.push({
          id: `del_acre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          category: 'acre_subplot',
          title: `एकड़ #${prevSub.acreNumber} (${prevSub.name})`,
          subtitle: `${(prevPlot.name || 'खेत').split('(')[0].trim()} · ${
            prevSub.acres
          } एकड़ · स्टेटस: ${prevSub.acreStatus || 'Empty'}`,
          amount: acreExp > 0 ? acreExp : undefined,
          deletedAt: nowIso,
          payload: {
            parentPlotId: prevPlot.id,
            parentPlotName: prevPlot.name,
            acreSubPlot: prevSub,
          },
        });
      } else {
        // Acre survived — check if any AcreExpenseEntry inside it was deleted
        const currSub = currSubs.find((s) => s.id === prevSub.id);
        if (!currSub) continue;
        const prevExpEntries = prevSub.expenseEntries || [];
        const currExpIds = new Set(
          (currSub.expenseEntries || []).map((e) => e.id)
        );

        for (const prevEntry of prevExpEntries) {
          if (!currExpIds.has(prevEntry.id)) {
            let linkedMach = undefined;
            if (prevEntry.ledgerRecordId) {
              linkedMach = (prevStore.machineryRecords || []).find(
                (m) => m.id === prevEntry.ledgerRecordId
              );
              if (linkedMach) {
                capturedMachineryIds.add(linkedMach.id);
              }
            }
            newlyDeletedEntries.push({
              id: `del_acre_exp_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`,
              category: 'acre_expense',
              title: `एकड़ #${prevSub.acreNumber}: ${prevEntry.machineryOrJob} (${prevEntry.workerName})`,
              subtitle: `${(prevPlot.name || 'खेत')
                .split('(')[0]
                .trim()} · रेट ₹${prevEntry.rate}/एकड़ · ${formatDateDDMMYYYY(
                prevEntry.date
              )}`,
              amount: prevEntry.totalAmount,
              deletedAt: nowIso,
              payload: {
                parentPlotId: prevPlot.id,
                parentPlotName: prevPlot.name,
                parentAcreId: prevSub.id,
                acreNumber: prevSub.acreNumber,
                acreExpenseEntry: prevEntry,
                linkedMachineryRecord: linkedMach,
              },
            });
          }
        }
      }
    }
  }

  // 3. Check for deleted MachineryRecords from Hisab-Kitab
  const nextMachIds = new Set(
    (nextStore.machineryRecords || []).map((m) => m.id)
  );
  for (const prevMach of prevStore.machineryRecords || []) {
    if (
      !nextMachIds.has(prevMach.id) &&
      !capturedMachineryIds.has(prevMach.id)
    ) {
      // Check if this MachineryRecord was linked to a Per-Acre expense entry via ledgerRecordId
      let linkedPlotId: string | undefined;
      let linkedPlotName: string | undefined;
      let linkedAcreId: string | undefined;
      let linkedAcreNum: number | string | undefined;
      let linkedAcreEntry = undefined;

      workingPlots = workingPlots.map((p) => {
        if (!p.subPlots) return p;
        let plotModified = false;
        const nextSubs = p.subPlots.map((sp) => {
          const matchingEntry = (sp.expenseEntries || []).find(
            (e) => e.ledgerRecordId === prevMach.id
          );
          if (!matchingEntry) return sp;
          plotModified = true;
          linkedPlotId = p.id;
          linkedPlotName = p.name;
          linkedAcreId = sp.id;
          linkedAcreNum = sp.acreNumber;
          linkedAcreEntry = matchingEntry;
          const filteredEntries = (sp.expenseEntries || []).filter(
            (e) => e.id !== matchingEntry.id
          );
          return recalculateAcreExpenses({
            ...sp,
            expenseEntries: filteredEntries,
          });
        });
        return plotModified ? { ...p, subPlots: nextSubs } : p;
      });

      newlyDeletedEntries.push({
        id: `del_mach_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'machinery',
        title: `मशीनरी: ${prevMach.activity} (${prevMach.driverName})`,
        subtitle: `${prevMach.plotName} · ${prevMach.acres} एकड़ · ${formatDateDDMMYYYY(
          prevMach.date
        )}`,
        amount: prevMach.totalAmount,
        deletedAt: nowIso,
        payload: {
          machineryRecord: prevMach,
          parentPlotId: linkedPlotId,
          parentPlotName: linkedPlotName,
          parentAcreId: linkedAcreId,
          acreNumber: linkedAcreNum,
          acreExpenseEntry: linkedAcreEntry,
        },
      });
    }
  }

  // 4. Check for deleted LabourRecords
  const nextLabIds = new Set((nextStore.labourRecords || []).map((l) => l.id));
  for (const prevLab of prevStore.labourRecords || []) {
    if (!nextLabIds.has(prevLab.id)) {
      newlyDeletedEntries.push({
        id: `del_lab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'labour',
        title: `मजदूरी: ${prevLab.activity} (${prevLab.mateName})`,
        subtitle: `${prevLab.plotName} · ${prevLab.workersCount} मजदूर · ${formatDateDDMMYYYY(
          prevLab.date
        )}`,
        amount: prevLab.totalAmount,
        deletedAt: nowIso,
        payload: {
          labourRecord: prevLab,
        },
      });
    }
  }

  // 5. Check for deleted MaterialRecords
  const nextMatIds = new Set(
    (nextStore.materialRecords || []).map((m) => m.id)
  );
  for (const prevMat of prevStore.materialRecords || []) {
    if (!nextMatIds.has(prevMat.id)) {
      newlyDeletedEntries.push({
        id: `del_mat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'material',
        title: `खाद/बीज/दवा: ${prevMat.itemName} (${prevMat.quantity} ${prevMat.unit})`,
        subtitle: `${prevMat.vendor} · ${
          prevMat.plotName || 'सभी खेत'
        } · ${formatDateDDMMYYYY(prevMat.date)}`,
        amount: prevMat.totalAmount,
        deletedAt: nowIso,
        payload: {
          materialRecord: prevMat,
        },
      });
    }
  }

  // 6. Check for deleted AadtiRecords
  const nextAadtiIds = new Set((nextStore.aadtiRecords || []).map((a) => a.id));
  for (const prevAadti of prevStore.aadtiRecords || []) {
    if (!nextAadtiIds.has(prevAadti.id)) {
      newlyDeletedEntries.push({
        id: `del_aadti_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'aadti',
        title: `मंडी खाता (${
          prevAadti.type === 'credit' ? 'जमा/बिक्री' : 'उधार/नामे'
        }): ${prevAadti.description}`,
        subtitle: `${prevAadti.aadtiName} · ${formatDateDDMMYYYY(
          prevAadti.date
        )}`,
        amount: prevAadti.amount,
        deletedAt: nowIso,
        payload: {
          aadtiRecord: prevAadti,
        },
      });
    }
  }

  // 7. Check for deleted FarmTasks
  const nextTaskIds = new Set((nextStore.tasks || []).map((t) => t.id));
  for (const prevTask of prevStore.tasks || []) {
    if (!nextTaskIds.has(prevTask.id)) {
      newlyDeletedEntries.push({
        id: `del_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'task',
        title: `कार्य रिमाइंडर: ${prevTask.title}`,
        subtitle: `${prevTask.plotName || 'फार्म कार्य'} · तारीख: ${formatDateDDMMYYYY(
          prevTask.dueDate
        )}`,
        amount: prevTask.pendingAmount,
        deletedAt: nowIso,
        payload: {
          task: prevTask,
        },
      });
    }
  }

  const baseHistory = nextStore.deletedHistory ?? prevStore.deletedHistory ?? [];
  const mergedHistory = [...newlyDeletedEntries, ...baseHistory].slice(
    0,
    MAX_UNDO_HISTORY
  );

  return {
    updatedStore: {
      ...nextStore,
      plots: workingPlots,
      deletedHistory: mergedHistory,
    },
    newlyDeletedEntries,
  };
}

/**
 * Restores a specific DeletedHistoryEntry back into the active FarmDataStore
 * and removes it from store.deletedHistory.
 */
export function restoreDeletedHistoryEntry(
  store: FarmDataStore,
  entryId: string
): {
  updatedStore: FarmDataStore;
  restoredEntry: DeletedHistoryEntry | null;
} {
  const history = store.deletedHistory || [];
  const targetEntry = history.find((item) => item.id === entryId);
  if (!targetEntry) {
    return { updatedStore: store, restoredEntry: null };
  }

  const remainingHistory = history.filter((item) => item.id !== entryId);
  let nextPlots = [...store.plots];
  let nextMachinery = [...store.machineryRecords];
  let nextLabour = [...store.labourRecords];
  let nextMaterials = [...store.materialRecords];
  let nextAadti = [...store.aadtiRecords];
  let nextTasks = [...store.tasks];

  const { category, payload } = targetEntry;

  if (category === 'plot' && payload.plot) {
    const exists = nextPlots.some((p) => p.id === payload.plot!.id);
    if (!exists) {
      nextPlots = [...nextPlots, payload.plot];
    }
  } else if (category === 'acre_subplot' && payload.acreSubPlot) {
    const restoredAcre = payload.acreSubPlot;
    nextPlots = nextPlots.map((p) => {
      if (p.id !== payload.parentPlotId && p.name !== payload.parentPlotName) {
        return p;
      }
      const existingSubs = p.subPlots || [];
      if (existingSubs.some((s) => s.id === restoredAcre.id)) {
        return p;
      }
      const mergedSubs = [...existingSubs, restoredAcre]
        .sort((a, b) => Number(a.acreNumber) - Number(b.acreNumber))
        .map((s, idx) => ({
          ...s,
          acreNumber: idx + 1,
        }));
      const totalAcres = Number(
        mergedSubs
          .reduce((sum, s) => sum + (Number(s.acres) || 1), 0)
          .toFixed(2)
      );
      return {
        ...p,
        acres: totalAcres > 0 ? totalAcres : p.acres,
        subPlots: mergedSubs,
      };
    });
  } else if (category === 'acre_expense' && payload.acreExpenseEntry) {
    const entryToRestore = payload.acreExpenseEntry;
    nextPlots = nextPlots.map((p) => {
      if (p.id !== payload.parentPlotId && p.name !== payload.parentPlotName) {
        return p;
      }
      const updatedSubs = (p.subPlots || []).map((sp) => {
        if (
          sp.id !== payload.parentAcreId &&
          String(sp.acreNumber) !== String(payload.acreNumber)
        ) {
          return sp;
        }
        const currEntries = sp.expenseEntries || [];
        if (currEntries.some((e) => e.id === entryToRestore.id)) {
          return sp;
        }
        const nextEntries = [...currEntries, entryToRestore];
        const jobTag = `${entryToRestore.machineryOrJob} (${entryToRestore.workerName} - ₹${entryToRestore.totalAmount})`;
        const currActivities = sp.completedActivities || [];
        const nextActivities = currActivities.includes(jobTag)
          ? currActivities
          : [...currActivities, jobTag];
        return recalculateAcreExpenses({
          ...sp,
          expenseEntries: nextEntries,
          completedActivities: nextActivities,
        });
      });
      return {
        ...p,
        subPlots: updatedSubs,
      };
    });

    if (
      payload.linkedMachineryRecord &&
      !nextMachinery.some((m) => m.id === payload.linkedMachineryRecord!.id)
    ) {
      nextMachinery = [payload.linkedMachineryRecord, ...nextMachinery];
    }
  } else if (category === 'machinery' && payload.machineryRecord) {
    if (!nextMachinery.some((m) => m.id === payload.machineryRecord!.id)) {
      nextMachinery = [payload.machineryRecord, ...nextMachinery];
    }
    // If this machinery record also had a linked Per-Acre entry, restore it on the Acre too!
    if (payload.acreExpenseEntry && payload.parentPlotId) {
      const entryToRestore = payload.acreExpenseEntry;
      nextPlots = nextPlots.map((p) => {
        if (p.id !== payload.parentPlotId) return p;
        const updatedSubs = (p.subPlots || []).map((sp) => {
          if (sp.id !== payload.parentAcreId) return sp;
          const currEntries = sp.expenseEntries || [];
          if (currEntries.some((e) => e.id === entryToRestore.id)) return sp;
          return recalculateAcreExpenses({
            ...sp,
            expenseEntries: [...currEntries, entryToRestore],
          });
        });
        return { ...p, subPlots: updatedSubs };
      });
    }
  } else if (category === 'labour' && payload.labourRecord) {
    if (!nextLabour.some((l) => l.id === payload.labourRecord!.id)) {
      nextLabour = [payload.labourRecord, ...nextLabour];
    }
  } else if (category === 'material' && payload.materialRecord) {
    if (!nextMaterials.some((m) => m.id === payload.materialRecord!.id)) {
      nextMaterials = [payload.materialRecord, ...nextMaterials];
    }
  } else if (category === 'aadti' && payload.aadtiRecord) {
    if (!nextAadti.some((a) => a.id === payload.aadtiRecord!.id)) {
      nextAadti = [payload.aadtiRecord, ...nextAadti];
    }
  } else if (category === 'task' && payload.task) {
    if (!nextTasks.some((t) => t.id === payload.task!.id)) {
      nextTasks = [payload.task, ...nextTasks];
    }
  }

  return {
    updatedStore: {
      ...store,
      plots: nextPlots,
      machineryRecords: nextMachinery,
      labourRecords: nextLabour,
      materialRecords: nextMaterials,
      aadtiRecords: nextAadti,
      tasks: nextTasks,
      deletedHistory: remainingHistory,
    },
    restoredEntry: targetEntry,
  };
}
