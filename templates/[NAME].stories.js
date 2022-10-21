import React from 'react'
import [NAME] from './[NAME]'

const [NAME]Meta = {
    title: "[TYPE]/[NAME]",
    component: [NAME],
    argTypes: {
        testID: { table: { disable: true } },
        utilityClasses: { name: "Utility Classes" },
        exceptionType: { name: "Exception Type"}
    }
}

const testID = "[NAME]-" + Math.floor(Math.random() * 90000) + 10000
const Template = (args) => <[NAME] {...args} />

export const Default[NAME] = Template.bind({})
Default[NAME].args = {
    testID: testID,
    utilityClasses: []
}

export default [NAME]Meta