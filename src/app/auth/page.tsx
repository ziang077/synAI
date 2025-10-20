// Component imports from shadcn/ui
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function Auth() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md bg-gray-900 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Login
          </h1>
          <p className="mt-2 text-sm text-gray-300">
            Sign in to your account
          </p>
        </div>
        
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" type="text" placeholder="Enter your username" />
              <FieldDescription>
                Choose a unique username for your account.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
              <Input id="password" type="password" placeholder="Enter your password" />
            </Field>
          </FieldGroup>
        </FieldSet>
        
        <div className="mt-6">
          <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200">
            Sign In
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300">
            Forgot your password?
          </a>
        </div>
      </div>
    </main>
  );
}
  