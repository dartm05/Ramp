import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, loading: employeesLoading, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const {
    data: transactionsByEmployee,
    loading: transactionsLoading,
    ...transactionsByEmployeeUtils
  } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [hasMoreData, setHasMoreData] = useState(true)

  useEffect(() => {
    setTransactions(paginatedTransactions?.data ?? transactionsByEmployee ?? [])
  }, [paginatedTransactions, transactionsByEmployee])

  const updateTransaction = useCallback((transactionId: string, approved: boolean) => {
    setTransactions(
      (prev) => prev?.map((t) => (t.id === transactionId ? { ...t, approved } : t)) ?? null
    )
  }, [])

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeesLoading) {
      loadAllTransactions()
    }
  }, [employeesLoading, employees, loadAllTransactions])

  const handleViewMore = async () => {
    if (!hasMoreData) return
    await loadAllTransactions()
    const newTransactions = paginatedTransactions?.data ?? transactionsByEmployee ?? []
    if (newTransactions.length === 0) {
      setHasMoreData(false)
    } else {
      setTransactions((prevTransactions) => [...prevTransactions, ...newTransactions])
    }
  }

  const handleEmployeeChange = async (newValue: Employee | null) => {
    setSelectedEmployee(newValue)
    if (newValue === null || newValue.id == EMPTY_EMPLOYEE.id) {
      await loadAllTransactions()
    } else {
      await loadTransactionsByEmployee(newValue.id)
    }
  }

  const isTransactionsPaginated = selectedEmployee === null || selectedEmployee.id === EMPTY_EMPLOYEE.id

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeesLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={handleEmployeeChange}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} updateTransaction={updateTransaction} />
          {isTransactionsPaginated &&
            transactions.length > 0 &&
            hasMoreData &&
            paginatedTransactions?.nextPage != null && (
              <button className="RampButton" disabled={transactionsLoading} onClick={handleViewMore}>
                View More
              </button>
            )}
        </div>
      </main>
    </Fragment>
  )
}
