import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { EditTaskForm } from "./edit-task-form";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import { Task } from "@/types";

type TaskModalProps = {
  task: Task;
  isOpen: boolean;
  mode: 'view' | 'edit';
  onClose: () => void;
};

export function TaskModal({ task, isOpen, mode, onClose }: TaskModalProps) {
  if (!task) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  {mode === 'view' ? 'Task Details' : 'Edit Task'}
                </Dialog.Title>

                {mode === 'view' ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          Client
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {task.client}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          Date
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {new Date(task.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          Hours
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {task.hours.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                          Amount
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {formatCurrency(task.amount ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {task.description}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <EditTaskForm task={task} onClose={onClose} />
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 