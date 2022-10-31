import React from 'react'
import [NAME] from './[NAME]'

const [NAME]Meta = {
    title: "[TYPE]/[NAME]",
    component: [NAME],
    argTypes: {
        testID: { table: { disable: true } },
        size: { name: "Size" },
        type: { name: "Type"}
    }
}

const testID = "[NAME]-" + Math.floor(Math.random() * 90000) + 10000
const Template = (args) => <[NAME] {...args} />

export const Default[NAME] = Template.bind({})
Default[NAME].args = {
    testID: testID,
    size: "medium",
    type: "regular"
}

export default [NAME]Meta